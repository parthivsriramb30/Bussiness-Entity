from pydantic import BaseModel
from typing import Optional

class AuditReviewCreate(BaseModel):
    run_id: str
    source1_id: str
    reviewer_name: str
    decision: str  # 'agreed', 'disagreed', 'flagged'
    notes: Optional[str] = ""

class AuditReviewResponse(BaseModel):
    id: str
    run_id: str
    source1_id: str
    reviewer_name: str
    decision: str
    notes: Optional[str] = ""
    created_at: str
