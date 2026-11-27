"""Plan and verify object moves before updating database references.

MLflow and DVC layouts are intentionally outside this migration's ownership.
The caller retains a private backup and a resumable journal.
"""

import hashlib
import os
from pathlib import PurePosixPath

from sqlalchemy import select

from packages.core.models.dataset import Dataset, DatasetVersion
from packages.core.models.model_registry import ModelVersion, RegisteredModel
from packages.core.models.monitoring import DataQualityReport, DriftEvaluation
from packages.core.models.project import Project
from packages.core.storage.layout import (
    archived_key,
    dataset_version_key,
    evaluation_key,
    resource_prefix,
)

MODELS = {model.__tablename__: model for model in (
    Project, Dataset, RegisteredModel, DatasetVersion, DriftEvaluation, DataQualityReport,
)}


def location(value, default_bucket):
    if value.startswith("s3://"):
        bucket, _, key = value[5:].partition("/")
        return bucket, key
    return default_bucket, value


async def build_plan(session, storage, archive_unreferenced=False):
    datasets_bucket = storage.default_bucket
    evaluations_bucket = os.getenv("MINIO_EVALUATIONS_BUCKET", "mlite-evaluations")
    buckets = {datasets_bucket: storage.list_files(bucket_name=datasets_bucket),
               evaluations_bucket: storage.list_files(bucket_name=evaluations_bucket)}
    datasets = {row.id: row for row in (await session.scalars(select(Dataset))).all()}
    models = {row.name: row for row in (await session.scalars(select(RegisteredModel))).all()}
    projects = list((await session.scalars(select(Project))).all())
    plan = {"version": 1, "moves": [], "updates": [], "prefixes": [], "stage": "planned"}
    referenced = set()
    moves = set()
    # Legacy registered artifacts can live outside the native MLflow bucket.
    # They must not be mistaken for abandoned dataset/report files.
    protected = set()
    for version in (await session.scalars(select(ModelVersion))).all():
        for uri in (version.artifact_path, version.mlflow_model_uri):
            if uri and uri.startswith("s3://"):
                bucket, key = location(uri, datasets_bucket)
                protected.update((bucket, candidate) for candidate in buckets.get(bucket, [])
                                 if candidate == key or candidate.startswith(key.rstrip("/") + "/"))
    plan["retained_sources"] = [list(identity) for identity in sorted(protected)]

    def move(bucket, source, target):
        referenced.add((bucket, source))
        if source != target and (bucket, source, target) not in moves:
            plan["moves"].append({"bucket": bucket, "source": source, "target": target})
            moves.add((bucket, source, target))

    def update(row, field, value):
        before = getattr(row, field)
        if before != value:
            plan["updates"].append({"table": row.__tablename__, "id": row.id, "field": field,
                                    "before": before, "after": value})

    for version in (await session.scalars(select(DatasetVersion))).all():
        if not version.s3_key:
            continue
        bucket, key = location(version.s3_key, datasets_bucket)
        if bucket != datasets_bucket or key.startswith("dvc-cache/"):
            continue
        dataset = datasets[version.dataset_id]
        prefix = await resource_prefix(session, dataset, "datasets")
        target = dataset_version_key(prefix, version.version_num, key)
        move(bucket, key, target)
        update(version, "s3_key", f"s3://{bucket}/{target}")

    for report in (await session.scalars(select(DataQualityReport))).all():
        if not report.s3_report_key:
            continue
        bucket, key = location(report.s3_report_key, evaluations_bucket)
        if bucket != evaluations_bucket:
            continue
        prefix = await resource_prefix(session, datasets[report.dataset_id], "datasets")
        target = key if key.startswith(prefix + "/") else evaluation_key(prefix, "quality", report.id, report.created_at) + "/report.json"
        move(bucket, key, target)
        update(report, "s3_report_key", f"s3://{bucket}/{target}")

    for report in (await session.scalars(select(DriftEvaluation))).all():
        if not report.html_report_path:
            continue
        bucket, key = location(report.html_report_path, evaluations_bucket)
        if bucket != evaluations_bucket:
            continue
        if report.model_name not in models:
            target = key if key.startswith("legacy/") else archived_key(key, "reports")
        else:
            prefix = await resource_prefix(session, models[report.model_name], "models")
            # Existing canonical reports include their real deployment version, if known.
            target = key if key.startswith(prefix + "/") else evaluation_key(prefix, "drift", report.id, report.created_at) + "/report.html"
        move(bucket, key, target)
        companion = str(PurePosixPath(key).with_name("metrics.json"))
        if companion in buckets[bucket]:
            move(bucket, companion, str(PurePosixPath(target).with_name("metrics.json")))
        update(report, "html_report_path", f"s3://{bucket}/{target}")

    if archive_unreferenced:
        for bucket, keys in buckets.items():
            for key in keys:
                if (bucket, key) in referenced or (bucket, key) in protected or key.startswith(("legacy/", "dvc-cache/")):
                    continue
                # Canonical files can belong to an upload in progress: never collect them.
                if key.startswith("users/") and "/versions/v" in key:
                    continue
                category = "datasets" if bucket == datasets_bucket else "reports"
                move(bucket, key, archived_key(key, category))
    for resource in [*projects, *datasets.values(), *models.values()]:
        if resource.storage_prefix:
            plan["prefixes"].append({"table": resource.__tablename__, "id": resource.id,
                                     "prefix": resource.storage_prefix})
    return plan


async def lock_references(session, plan):
    """Hold affected rows until all copies and reference changes have committed."""
    for entry in plan["updates"]:
        model = MODELS[entry["table"]]
        row = await session.scalar(select(model).where(model.id == entry["id"]).with_for_update())
        if row is None or getattr(row, entry["field"]) not in (entry["before"], entry["after"]):
            raise RuntimeError("A storage reference changed since the plan was created. Re-plan before moving files.")


async def update_references(session, plan):
    for entry in plan["prefixes"]:
        row = await session.get(MODELS[entry["table"]], entry["id"])
        if row is None or row.storage_prefix not in (None, entry["prefix"]):
            raise RuntimeError("A storage namespace changed since planning.")
        row.storage_prefix = entry["prefix"]
    for entry in plan["updates"]:
        row = await session.get(MODELS[entry["table"]], entry["id"])
        setattr(row, entry["field"], entry["after"])
    await session.flush()


def backup_object(storage, move, directory):
    """Download original bytes and headers before allowing a move."""
    identity = f"s3://{move['bucket']}/{move['source']}"
    filename = hashlib.sha256(identity.encode()).hexdigest() + ".bin"
    path = directory / filename
    if not path.exists() or not move.get("sha256"):
        head = storage._s3.head_object(Bucket=move["bucket"], Key=move["source"])
        storage.download_file(move["source"], path, bucket_name=move["bucket"])
        path.chmod(0o600)
        checksum = storage.compute_sha256(path)
        if checksum != storage.object_sha256(move["source"], move["bucket"]):
            raise RuntimeError("Source changed while backing up; no source object was removed.")
        move.update(backup=filename, sha256=checksum, etag=head["ETag"],
                    metadata=head.get("Metadata", {}), content_type=head.get("ContentType", "application/octet-stream"))
    if storage.compute_sha256(path) != move["sha256"]:
        raise RuntimeError("The private backup failed checksum verification; originals retained.")
    return path


def copy_verified(storage, move):
    bucket, source, target = (move[field] for field in ("bucket", "source", "target"))
    if not storage.file_exists(target, bucket):
        storage._s3.copy_object(Bucket=bucket, Key=target,
                                CopySource={"Bucket": bucket, "Key": source},
                                CopySourceIfMatch=move["etag"], MetadataDirective="COPY")
    if storage.object_sha256(target, bucket) != move["sha256"]:
        raise RuntimeError("Destination checksum mismatch; original objects and references are retained.")


def remove_originals(storage, plan):
    targets = {(move["bucket"], move["target"]) for move in plan["moves"]}
    retained = {tuple(identity) for identity in plan.get("retained_sources", [])}
    removed = set()
    for move in plan["moves"]:
        identity = (move["bucket"], move["source"])
        if identity in targets or identity in retained or identity in removed or not storage.file_exists(move["source"], move["bucket"]):
            continue
        # Recheck both ends before deleting: a matching ETag alone is insufficient.
        if storage.object_sha256(move["source"], move["bucket"]) != move["sha256"]:
            raise RuntimeError("Source changed after copying; original retained.")
        if storage.object_sha256(move["target"], move["bucket"]) != move["sha256"]:
            raise RuntimeError("Destination changed after copying; original retained.")
        storage.delete_file(move["source"], move["bucket"])
        removed.add(identity)
