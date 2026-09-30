from fastapi import APIRouter
from app.config import settings
from app.services.hardware_service import HardwareService

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def get_system_settings():
    hw = HardwareService.get_hardware_metrics()
    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "base_dir": str(settings.BASE_DIR),
        "dataset_dir": str(settings.DATASET_DIR),
        "storage_dir": str(settings.STORAGE_DIR),
        "models_dir": str(settings.MODELS_DIR),
        "runs_dir": str(settings.RUNS_DIR),
        "default_model_path": str(settings.DEFAULT_MODEL_PATH),
        "default_top_k": settings.DEFAULT_TOP_K,
        "default_threshold": settings.DEFAULT_THRESHOLD,
        "hardware": hw
    }
