from pydantic import BaseModel
from typing import Dict, List, Optional, Any

class ResultRow(BaseModel):
    source1_entity_id: str
    business_name: Optional[str] = None
    business_address: Optional[str] = None
    country: Optional[str] = None
    matched_entity_ids: List[str] = []
    match_count: int = 0
    candidate_entity_ids: List[str] = []
    candidate_count: int = 0
    top_score: Optional[float] = None
    is_singleton: bool = True

class ResultsResponse(BaseModel):
    run_id: str
    total_records: int
    matched_records: int
    singleton_records: int
    page: int
    page_size: int
    total_pages: int
    rows: List[ResultRow]

class CandidateComparisonItem(BaseModel):
    cand_id: str
    cand_name: str
    cand_addr: str
    cand_country: str
    score: float
    threshold: float
    is_match: bool
    features: Dict[str, float]

class ComparisonResponse(BaseModel):
    run_id: str
    s1_id: str
    s1_name: str
    s1_addr: str
    s1_country: str
    candidates: List[CandidateComparisonItem]
