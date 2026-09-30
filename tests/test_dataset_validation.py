import pytest
from pathlib import Path
import sys

# Ensure backend in path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.services.dataset_service import DatasetService
from app.config import settings


def test_placeholder_bundle_is_rejected():
    """Verify that header-only placeholders are detected and rejected."""
    placeholder_dir = settings.BASE_DIR / "dataset_placeholders"
    if placeholder_dir.exists():
        res = DatasetService.validate_dataset_directory(placeholder_dir)
        assert res.is_placeholder_detected is True
        assert res.status == "placeholder"
        assert len(res.errors) > 0
        assert any("placeholder" in err.lower() for err in res.errors)


def test_real_dataset_is_validated_ready():
    """Verify that real challenge dataset files have valid headers and rows."""
    dataset_dir = settings.DATASET_DIR
    if dataset_dir.exists():
        res = DatasetService.validate_dataset_directory(dataset_dir)
        assert res.is_placeholder_detected is False
        assert res.status == "ready"
        assert res.total_train_rows > 1000
        assert res.total_test_rows > 1000
        assert "US" in res.countries_detected
        assert "India" in res.countries_detected
        assert "France" in res.countries_detected or res.has_france is True
