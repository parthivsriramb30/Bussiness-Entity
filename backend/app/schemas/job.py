from pydantic import BaseModel
from typing import Dict, List, Optional, Any

class JobLaunchRequest(BaseModel):
    job_type: str  # 'inference', 'training', 'evaluation'
    mode: str = "sample"  # 'sample', 'full'
    sample_size: int = 2000
    dataset_id: Optional[str] = None
    model_id: Optional[str] = None
    top_k: int = 10
    threshold: Optional[float] = None
    max_matches: Optional[int] = None
    batch_size: int = 5000

class JobStatusResponse(BaseModel):
    id: str
    job_type: str
    mode: str
    sample_size: Optional[int] = None
    status: str  # 'queued', 'running', 'completed', 'failed', 'cancelled', 'interrupted'
    stage: str
    progress: float
    processed_count: int
    total_count: int
    dataset_id: Optional[str] = None
    model_id: Optional[str] = None
    run_dir: Optional[str] = None
    error_message: Optional[str] = None
    config: Dict[str, Any] = {}
    memory_mb: float = 0.0
    cpu_percent: float = 0.0
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: Optional[str] = None

class JobListResponse(BaseModel):
    jobs: List[JobStatusResponse]

class JobLogResponse(BaseModel):
    job_id: str
    logs: str
    status: str
