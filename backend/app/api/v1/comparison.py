from pathlib import Path
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.db.duckdb_store import DuckDBStore
from app.services.ml_adapter import MLAdapter
from app.schemas.result import ComparisonResponse
from src.preprocess import clean_name, clean_address, extract_numbers

router = APIRouter(prefix="/comparison", tags=["comparison"])


class LiveCompareRequest(BaseModel):
    name1: str
    address1: str
    country1: str = "US"
    name2: str
    address2: str
    country2: str = "US"
    threshold: Optional[float] = None


@router.post("/live")
def live_compare(req: LiveCompareRequest):
    """
    Directly compare any two business records in real-time using the trained XGBoost model
    and display the resulting score, match decision, and all 21 extracted features.
    """
    if not req.name1.strip() or not req.name2.strip():
        raise HTTPException(status_code=400, detail="Business names cannot be empty")

    matcher = MLAdapter.load_model(settings.DEFAULT_MODEL_PATH)
    if req.threshold is not None:
        matcher.threshold = float(req.threshold)

    s1_rec = ("S1-QUERY", req.name1, req.address1, req.country1)
    cand_rec = ("S2-TARGET", req.name2, req.address2, req.country2)

    res = MLAdapter.score_single_pair(matcher, s1_rec, cand_rec)

    nums1 = list(extract_numbers(req.address1))
    nums2 = list(extract_numbers(req.address2))
    shared_nums = list(set(nums1) & set(nums2))

    return {
        "score": round(res["score"], 4),
        "threshold": round(matcher.threshold, 4),
        "is_match": res["is_match"],
        "entity1": {
            "name": req.name1,
            "address": req.address1,
            "country": req.country1,
            "clean_name": clean_name(req.name1),
            "clean_address": clean_address(req.address1),
            "numbers": nums1
        },
        "entity2": {
            "name": req.name2,
            "address": req.address2,
            "country": req.country2,
            "clean_name": clean_name(req.name2),
            "clean_address": clean_address(req.address2),
            "numbers": nums2
        },
        "shared_numbers": shared_nums,
        "features": {k: round(v, 4) if isinstance(v, float) else v for k, v in res["features"].items()}
    }


@router.get("/{run_id}/{s1_id}", response_model=ComparisonResponse)
def get_entity_comparison(run_id: str, s1_id: str):
    run_dir = settings.RUNS_DIR / run_id
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail="Run not found")

    res = DuckDBStore.query_comparison(run_dir, s1_id)
    s1_info = res.get("s1", {})

    return ComparisonResponse(
        run_id=run_id,
        s1_id=s1_id,
        s1_name=s1_info.get("name") or "Source 1 Business",
        s1_addr=s1_info.get("address") or "Source 1 Address",
        s1_country=s1_info.get("country") or "Derived",
        candidates=res.get("candidates", [])
    )
