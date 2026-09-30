from pydantic import BaseModel
from typing import Dict, List, Optional, Any

class TSVFileStats(BaseModel):
    name: str
    exists: bool
    size_bytes: int
    size_mb: float
    row_count: int
    is_placeholder: bool
    missing_fields_count: int
    has_valid_header: bool
    sample_preview: List[Dict[str, str]] = []

class DatasetValidationResult(BaseModel):
    status: str  # 'ready', 'incomplete', 'placeholder', 'error'
    message: str
    is_placeholder_detected: bool
    files: Dict[str, TSVFileStats]
    total_train_rows: int
    total_test_rows: int
    countries_detected: List[str]
    has_france: bool
    warnings: List[str]
    errors: List[str]

class DatasetInfo(BaseModel):
    id: str
    name: str
    path: str
    status: str
    checksum: Optional[str] = None
    train_records: int = 0
    test_records: int = 0
    record_counts: Dict[str, int] = {}
    country_counts: Dict[str, int] = {}
    validation_errors: List[str] = []
    is_active: bool = False
    created_at: Optional[str] = None

class DatasetListResponse(BaseModel):
    datasets: List[DatasetInfo]
    active_dataset_id: Optional[str] = None

class RegisterFolderRequest(BaseModel):
    folder_path: str
    name: Optional[str] = None
