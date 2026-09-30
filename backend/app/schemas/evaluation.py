from pydantic import BaseModel
from typing import Dict, List, Optional, Any

class ThresholdPoint(BaseModel):
    threshold: float
    macro_f_beta: float
    singleton_accuracy: float
    precision: float
    recall: float

class CountryMetrics(BaseModel):
    country: str
    total_entities: int
    macro_f_beta: float
    singleton_accuracy: float
    matched_rate: float

class EvaluationResponse(BaseModel):
    dataset_name: str
    model_version: str
    evaluated_entities: int
    macro_f_beta: float
    singleton_accuracy: float
    singleton_count: int
    non_singleton_count: int
    reduction_ratio: float
    candidate_recall: float
    optimal_threshold: float
    threshold_sweep: List[ThresholdPoint]
    country_breakdown: List[CountryMetrics]
    is_held_out: bool = True
