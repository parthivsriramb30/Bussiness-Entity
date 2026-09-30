import os
import sys
import json
import uuid
import datetime
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any

from app.config import settings
from app.db.database import get_db_ctx


class ProcessManager:
    @staticmethod
    def start_job(
        job_type: str,
        mode: str = "sample",
        sample_size: int = 2000,
        dataset_id: Optional[str] = None,
        model_id: Optional[str] = None,
        config: Dict[str, Any] = None
    ) -> str:
        """
        Create job record in SQLite and spawn detached worker process.
        """
        job_id = str(uuid.uuid4())[:8]
        run_dir = settings.RUNS_DIR / job_id
        run_dir.mkdir(parents=True, exist_ok=True)
        config = config or {}

        with get_db_ctx() as conn:
            conn.execute("""
                INSERT INTO jobs (
                    id, job_type, mode, sample_size, status, stage, progress,
                    dataset_id, model_id, run_dir, config_json, started_at
                ) VALUES (?, ?, ?, ?, 'queued', 'Queued in worker', 0.0, ?, ?, ?, ?, ?)
            """, (
                job_id, job_type, mode, sample_size,
                dataset_id, model_id, str(run_dir),
                json.dumps(config), datetime.datetime.now().isoformat()
            ))

        # Launch detached worker process
        worker_code = f"""
import sys
from pathlib import Path
sys.path.insert(0, r'{settings.BASE_DIR / "backend"}')
from app.workers.job_runner import execute_inference_job
execute_inference_job('{job_id}')
"""
        cmd = [sys.executable, "-c", worker_code]
        
        # Windows-safe detached creation flags
        creation_flags = 0
        if sys.platform == "win32":
            creation_flags = subprocess.CREATE_NO_WINDOW | subprocess.DETACHED_PROCESS

        subprocess.Popen(
            cmd,
            cwd=str(settings.BASE_DIR),
            creationflags=creation_flags,
            close_fds=True
        )

        return job_id

    @staticmethod
    def cancel_job(job_id: str) -> bool:
        with get_db_ctx() as conn:
            cur = conn.execute("""
                UPDATE jobs SET status = 'cancelled', stage = 'Cancelled by user'
                WHERE id = ? AND status IN ('queued', 'running')
            """, (job_id,))
            return cur.rowcount > 0

    @staticmethod
    def get_job(job_id: str) -> Optional[Dict[str, Any]]:
        with get_db_ctx() as conn:
            row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
            if not row:
                return None
            return dict(row)

    @staticmethod
    def get_job_logs(job_id: str) -> str:
        run_dir = settings.RUNS_DIR / job_id
        log_file = run_dir / "run.log"
        if log_file.exists():
            with open(log_file, "r", encoding="utf-8", errors="replace") as f:
                return f.read()
        return "No log available yet."
