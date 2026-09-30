import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException

from app.db.database import get_db_ctx
from app.schemas.audit import AuditReviewCreate, AuditReviewResponse

router = APIRouter(prefix="/audit", tags=["audit"])


@router.post("", response_model=AuditReviewResponse)
def add_audit_review(req: AuditReviewCreate):
    rev_id = str(uuid.uuid4())[:8]
    with get_db_ctx() as conn:
        conn.execute("""
            INSERT INTO audit_reviews (id, run_id, source1_id, reviewer_name, decision, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (rev_id, req.run_id, req.source1_id, req.reviewer_name, req.decision, req.notes))
        
        row = conn.execute("SELECT * FROM audit_reviews WHERE id = ?", (rev_id,)).fetchone()
        return AuditReviewResponse(
            id=row["id"],
            run_id=row["run_id"],
            source1_id=row["source1_id"],
            reviewer_name=row["reviewer_name"],
            decision=row["decision"],
            notes=row["notes"],
            created_at=str(row["created_at"])
        )


@router.get("/{run_id}", response_model=List[AuditReviewResponse])
def get_run_audit_reviews(run_id: str):
    with get_db_ctx() as conn:
        rows = conn.execute("SELECT * FROM audit_reviews WHERE run_id = ? ORDER BY created_at DESC", (run_id,)).fetchall()
        reviews = []
        for r in rows:
            reviews.append(AuditReviewResponse(
                id=r["id"],
                run_id=r["run_id"],
                source1_id=r["source1_id"],
                reviewer_name=r["reviewer_name"],
                decision=r["decision"],
                notes=r["notes"],
                created_at=str(r["created_at"])
            ))
        return reviews
