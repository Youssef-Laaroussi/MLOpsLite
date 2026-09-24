"""DVC integration wrapper for reproducible data versioning with MinIO S3 backend."""

import logging
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class DVCManager:
    """Automates DVC repo initialization and remote storage synchronization."""

    DEFAULT_REMOTE_NAME = "minio"
    DEFAULT_BUCKET = "mlite-datasets"
    DEFAULT_PREFIX = "dvc-cache"

    def __init__(
        self,
        project_dir: str | Path = ".",
        minio_endpoint: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
    ) -> None:
        self.project_dir = Path(project_dir).resolve()
        self.minio_endpoint = minio_endpoint or os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
        self.access_key = access_key or os.getenv("AWS_ACCESS_KEY_ID", "mlite_minio_admin")
        self.secret_key = secret_key or os.getenv("AWS_SECRET_ACCESS_KEY", "mlite_minio_password")

    @property
    def is_dvc_installed(self) -> bool:
        """Check if dvc CLI executable is available in PATH."""
        return shutil.which("dvc") is not None

    def _run_cmd(self, args: List[str], check: bool = True) -> subprocess.CompletedProcess:
        """Execute a DVC subprocess command inside the project directory."""
        if not self.is_dvc_installed:
            raise RuntimeError(
                "DVC is not installed or not in PATH. Install with: pip install dvc dvc-s3"
            )

        cmd = ["dvc"] + args
        logger.debug("Executing DVC command: %s", " ".join(cmd))
        return subprocess.run(
            cmd,
            cwd=str(self.project_dir),
            capture_output=True,
            text=True,
            check=check,
        )

    def init_project(self, no_scm: bool = False) -> Dict[str, Any]:
        """Initialize DVC in the current project and configure MinIO remote."""
        if not self.is_dvc_installed:
            return {
                "success": False,
                "error": "DVC is not installed. Run 'pip install dvc dvc-s3' first.",
            }

        try:
            # 1. dvc init
            args = ["init"]
            if no_scm:
                args.append("--no-scm")
            self._run_cmd(args, check=False)

            # 2. Configure default remote to MinIO S3 bucket
            s3_url = f"s3://{self.DEFAULT_BUCKET}/{self.DEFAULT_PREFIX}"
            self._run_cmd(["remote", "add", "-d", "-f", self.DEFAULT_REMOTE_NAME, s3_url], check=False)

            # 3. Configure endpoint URL & credentials
            self._run_cmd(["remote", "modify", self.DEFAULT_REMOTE_NAME, "endpointurl", self.minio_endpoint], check=False)
            self._run_cmd(["remote", "modify", self.DEFAULT_REMOTE_NAME, "access_key_id", self.access_key], check=False)
            self._run_cmd(["remote", "modify", self.DEFAULT_REMOTE_NAME, "secret_access_key", self.secret_key], check=False)

            return {
                "success": True,
                "remote_name": self.DEFAULT_REMOTE_NAME,
                "remote_url": s3_url,
                "endpoint": self.minio_endpoint,
            }
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    def add(self, target: str | Path) -> Dict[str, Any]:
        """Track a data file or directory with DVC (`dvc add <target>`)."""
        if not self.is_dvc_installed:
            return {"success": False, "error": "DVC not installed"}

        target_path = Path(target)
        if not target_path.exists():
            return {"success": False, "error": f"Target does not exist: {target}"}

        proc = self._run_cmd(["add", str(target_path)], check=False)
        dvc_file = Path(f"{target_path}.dvc")
        return {
            "success": proc.returncode == 0,
            "dvc_file": str(dvc_file) if dvc_file.exists() else None,
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
        }

    def push(self, targets: Optional[List[str]] = None) -> Dict[str, Any]:
        """Upload tracked data artifacts to MinIO remote storage (`dvc push`)."""
        if not self.is_dvc_installed:
            return {"success": False, "error": "DVC not installed"}

        args = ["push"]
        if targets:
            args.extend(targets)
        proc = self._run_cmd(args, check=False)
        return {
            "success": proc.returncode == 0,
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
        }

    def pull(self, targets: Optional[List[str]] = None) -> Dict[str, Any]:
        """Download tracked data artifacts from MinIO remote storage (`dvc pull`)."""
        if not self.is_dvc_installed:
            return {"success": False, "error": "DVC not installed"}

        args = ["pull"]
        if targets:
            args.extend(targets)
        proc = self._run_cmd(args, check=False)
        return {
            "success": proc.returncode == 0,
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
        }

    def checkout(self) -> Dict[str, Any]:
        """Update data files in the working directory to match .dvc pointer files (`dvc checkout`)."""
        if not self.is_dvc_installed:
            return {"success": False, "error": "DVC not installed"}

        proc = self._run_cmd(["checkout"], check=False)
        return {
            "success": proc.returncode == 0,
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
        }
