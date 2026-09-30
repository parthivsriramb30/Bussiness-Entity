import os
from pathlib import Path
from pydantic import BaseModel

# Repository Root (student_resource)
REPO_ROOT = Path(__file__).resolve().parent.parent.parent

class Settings(BaseModel):
    PROJECT_NAME: str = "EntityMatch"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Path configuration - resolving from repo root
    BASE_DIR: Path = REPO_ROOT
    DATASET_DIR: Path = REPO_ROOT / "dataset"
    STORAGE_DIR: Path = REPO_ROOT / "storage"
    MODELS_DIR: Path = REPO_ROOT / "storage" / "models"
    RUNS_DIR: Path = REPO_ROOT / "storage" / "runs"
    DATASETS_DIR: Path = REPO_ROOT / "storage" / "datasets"
    SQLITE_PATH: Path = REPO_ROOT / "storage" / "entitymatch.db"
    
    # ML challenge code paths
    ML_CODE_DIR: Path = REPO_ROOT / "code" / "business_entity_resolution"
    DEFAULT_MODEL_PATH: Path = REPO_ROOT / "code" / "business_entity_resolution" / "matcher_model.pkl"
    VALIDATOR_PATH: Path = REPO_ROOT / "utils" / "validate_submission.py"
    DOCUMENTATION_TEMPLATE_PATH: Path = REPO_ROOT / "Documentation_template.md"
    
    # Server configuration
    HOST: str = os.getenv("ENTITYMATCH_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("ENTITYMATCH_PORT", "8000"))
    WORKERS: int = 1
    
    # Runtime limits & defaults
    DEFAULT_TOP_K: int = 10
    DEFAULT_THRESHOLD: float = 0.40  # Stored checkpoint threshold
    MAX_SYSTEM_RAM_GB: float = 16.0
    BATCH_SIZE: int = 5000

settings = Settings()

# Ensure critical directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
settings.RUNS_DIR.mkdir(parents=True, exist_ok=True)
settings.DATASETS_DIR.mkdir(parents=True, exist_ok=True)
