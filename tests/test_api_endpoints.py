import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_datasets_endpoints():
    res = client.get("/api/v1/datasets")
    assert res.status_code == 200
    data = res.json()
    assert "datasets" in data
    assert len(data["datasets"]) > 0


def test_models_endpoints():
    res = client.get("/api/v1/models")
    assert res.status_code == 200
    data = res.json()
    assert "models" in data
    assert len(data["models"]) > 0
    m = data["models"][0]
    assert m["threshold"] == 0.40
    assert m["feature_count"] == 21


def test_settings_hardware_endpoints():
    res = client.get("/api/v1/settings")
    assert res.status_code == 200
    data = res.json()
    assert "hardware" in data
    assert data["hardware"]["total_ram_gb"] > 0
    assert data["hardware"]["cpu_cores"] > 0


def test_evaluation_endpoint():
    res = client.get("/api/v1/evaluation")
    assert res.status_code == 200
    data = res.json()
    assert data["macro_f_beta"] > 0.0
    assert len(data["threshold_sweep"]) > 0
    assert len(data["country_breakdown"]) > 0
