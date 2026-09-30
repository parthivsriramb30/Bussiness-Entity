import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException

from app.workers.process_manager import ProcessManager
from app.db.database import get_db_ctx
from app.schemas.job import (
    JobLaunchRequest,
    JobStatusResponse,
    JobListResponse,
    JobLogResponse
)

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobStatusResponse)
def launch_job(req: JobLaunchRequest):
    config = {
        "top_k": req.top_k,
        "threshold": req.threshold,
        "max_matches": req.max_matches,
        "batch_size": req.batch_size
    }
    
    job_id = ProcessManager.start_job(
        job_type=req.job_type,
        mode=req.mode,
        sample_size=req.sample_size,
        dataset_id=req.dataset_id,
        model_id=req.model_id,
        config=config
    )

    job_data = ProcessManager.get_job(job_id)
    if not job_data:
        raise HTTPException(status_code=500, detail="Failed to initialize job")

    return JobStatusResponse(
        id=job_data["id"],
        job_type=job_data["job_type"],
        mode=job_data["mode"],
        sample_size=job_data["sample_size"],
        status=job_data["status"],
        stage=job_data["stage"] or "initializing",
        progress=job_data["progress"] or 0.0,
        processed_count=job_data["processed_count"] or 0,
        total_count=job_data["total_count"] or 0,
        dataset_id=job_data["dataset_id"],
        model_id=job_data["model_id"],
        run_dir=job_data["run_dir"],
        error_message=job_data["error_message"],
        config=json.loads(job_data["config_json"] or "{}"),
        memory_mb=job_data["memory_mb"] or 0.0,
        cpu_percent=job_data["cpu_percent"] or 0.0,
        started_at=str(job_data["started_at"]) if job_data["started_at"] else None,
        completed_at=str(job_data["completed_at"]) if job_data["completed_at"] else None,
        created_at=str(job_data["created_at"]) if job_data["created_at"] else None
    )


@router.get("", response_model=JobListResponse)
def list_jobs():
    with get_db_ctx() as conn:
        rows = conn.execute("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50").fetchall()
        jobs = []
        for r in rows:
            jobs.append(JobStatusResponse(
                id=r["id"],
                job_type=r["job_type"],
                mode=r["mode"],
                sample_size=r["sample_size"],
                status=r["status"],
                stage=r["stage"] or "unknown",
                progress=r["progress"] or 0.0,
                processed_count=r["processed_count"] or 0,
                total_count=r["total_count"] or 0,
                dataset_id=r["dataset_id"],
                model_id=r["model_id"],
                run_dir=r["run_dir"],
                error_message=r["error_message"],
                config=json.loads(r["config_json"] or "{}"),
                memory_mb=r["memory_mb"] or 0.0,
                cpu_percent=r["cpu_percent"] or 0.0,
                started_at=str(r["started_at"]) if r["started_at"] else None,
                completed_at=str(r["completed_at"]) if r["completed_at"] else None,
                created_at=str(r["created_at"]) if r["created_at"] else None
            ))
        return JobListResponse(jobs=jobs)


@router.get("/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str):
    job_data = ProcessManager.get_job(job_id)
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatusResponse(
        id=job_data["id"],
        job_type=job_data["job_type"],
        mode=job_data["mode"],
        sample_size=job_data["sample_size"],
        status=job_data["status"],
        stage=job_data["stage"] or "unknown",
        progress=job_data["progress"] or 0.0,
        processed_count=job_data["processed_count"] or 0,
        total_count=job_data["total_count"] or 0,
        dataset_id=job_data["dataset_id"],
        model_id=job_data["model_id"],
        run_dir=job_data["run_dir"],
        error_message=job_data["error_message"],
        config=json.loads(job_data["config_json"] or "{}"),
        memory_mb=job_data["memory_mb"] or 0.0,
        cpu_percent=job_data["cpu_percent"] or 0.0,
        started_at=str(job_data["started_at"]) if job_data["started_at"] else None,
        completed_at=str(job_data["completed_at"]) if job_data["completed_at"] else None,
        created_at=str(job_data["created_at"]) if job_data["created_at"] else None
    )


@router.get("/{job_id}/logs", response_model=JobLogResponse)
def get_job_logs(job_id: str):
    job_data = ProcessManager.get_job(job_id)
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")
        
    logs = ProcessManager.get_job_logs(job_id)
    return JobLogResponse(job_id=job_id, logs=logs, status=job_data["status"])


@router.post("/{job_id}/cancel")
def cancel_job(job_id: str):
    success = ProcessManager.cancel_job(job_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot cancel job or job not found")
    return {"status": "success", "message": f"Job {job_id} cancelled"}
