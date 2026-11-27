"""Operator CLI: python -m packages.core.storage.migrate --help."""

import argparse
import asyncio
import json
import os
from datetime import UTC, datetime
from pathlib import Path


def configure_compose():
    """Resolve Docker's published ports for execution from the host machine."""
    from dotenv import dotenv_values
    from sqlalchemy.engine import URL

    values = dotenv_values(Path(__file__).resolve().parents[3] / ".env")
    os.environ["DATABASE_URL"] = URL.create(
        "postgresql+asyncpg", username=values.get("POSTGRES_USER", "mlite_user"),
        password=values.get("POSTGRES_PASSWORD", "mlite_secure_password"),
        host="127.0.0.1", port=int(values.get("DB_PORT", "5432")),
        database=values.get("POSTGRES_DB", "mlite_db"),
    ).render_as_string(hide_password=False)
    os.environ["MINIO_ENDPOINT"] = f"http://127.0.0.1:{values.get('MINIO_PORT', '9000')}"
    os.environ["AWS_ACCESS_KEY_ID"] = values.get("MINIO_ROOT_USER", "mlite_minio_admin")
    os.environ["AWS_SECRET_ACCESS_KEY"] = values.get("MINIO_ROOT_PASSWORD", "mlite_minio_password")
    for key in ("MINIO_DATASETS_BUCKET", "MINIO_EVALUATIONS_BUCKET"):
        if values.get(key):
            os.environ[key] = values[key]


def save(path, plan):
    temporary = path.with_suffix(".tmp")
    with temporary.open("w", encoding="utf-8") as stream:
        temporary.chmod(0o600)
        json.dump(plan, stream, indent=2)
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(path)


async def run(args):
    import packages.core.models  # noqa: F401
    from packages.core.db.session import async_session_factory, engine
    from packages.core.services.storage_schema import upgrade_storage_schema
    from packages.core.storage.client import StorageClient
    from packages.core.storage.reorganize import (
        backup_object,
        build_plan,
        copy_verified,
        lock_references,
        remove_originals,
        update_references,
    )

    storage = StorageClient()
    # The additive schema change is safe even before an operator applies object moves.
    async with engine.begin() as connection:
        await connection.run_sync(upgrade_storage_schema)
    journal = args.backup_dir / "plan.json"
    if args.apply and journal.exists():
        plan = json.loads(journal.read_text())
    else:
        async with async_session_factory() as session:
            plan = await build_plan(session, storage, args.archive_unreferenced)
            await session.rollback()
    print(f"Objects to move: {len(plan['moves'])}; database references: {len(plan['updates'])}", flush=True)
    if not args.apply:
        print("Preview only. Add --apply to copy, verify, update references and remove original keys.")
        await engine.dispose()
        return
    args.backup_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    args.backup_dir.chmod(0o700)
    objects = args.backup_dir / "objects"
    objects.mkdir(mode=0o700, exist_ok=True)
    save(journal, plan)
    if plan["stage"] == "planned":
        for move in plan["moves"]:
            backup_object(storage, move, objects)
            save(journal, plan)
        async with async_session_factory.begin() as session:
            await lock_references(session, plan)
            for move in plan["moves"]:
                copy_verified(storage, move)
            await update_references(session, plan)
        plan["stage"] = "references_updated"
        save(journal, plan)
    if plan["stage"] == "references_updated":
        remove_originals(storage, plan)
        plan["stage"] = "complete"
        save(journal, plan)
    print(f"Completed. Original bytes and reference journal retained in {args.backup_dir}")
    await engine.dispose()


def main():
    parser = argparse.ArgumentParser(description="Organize MLite storage; MLflow artifacts and DVC caches are preserved.")
    parser.add_argument("--local-compose", action="store_true", help="Connect to this checkout's Docker-published PostgreSQL/MinIO ports")
    parser.add_argument("--apply", action="store_true", help="Apply moves after backing up and verifying bytes")
    parser.add_argument("--archive-unreferenced", action="store_true", help="Archive old objects without an MLite database reference under legacy/unassigned")
    default = Path("secrets/backups") / ("storage-layout-" + datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ"))
    parser.add_argument("--backup-dir", type=Path, default=default, help="Private backup directory; reuse it to resume an interrupted migration")
    args = parser.parse_args()
    if args.local_compose:
        configure_compose()
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
