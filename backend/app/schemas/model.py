from pydantic import BaseModel
from typing import Dict, List, Optional, Any

class ModelInfo(BaseModel):
    id: str
    name: str
    version: str
    path: str
    file_hash: Optional[str] = None
    threshold: float
    feature_count: int
    feature_names: List[str]
    n_estimators: Optional[int] = None
    is_active: bool = False
    metadata: Dict[str, Any] = {}
    created_at: Optional[str] = None

class ModelListResponse(BaseModel):
    models: List[ModelInfo]
    active_model_id: Optional[str] = None

class ModelTrainRequest(BaseModel):
    name: str
    sample_size: int = 15000
    n_estimators: int = 150
    max_depth: int = 6
    learning_rate: float = 0.08
    threshold_range: Optional[List[float]] = None
