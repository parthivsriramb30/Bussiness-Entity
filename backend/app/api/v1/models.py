import os
import uuid
import json
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.db.database import get_db_ctx
from app.services.ml_adapter import MLAdapter, EXPECTED_21_FEATURES
from app.schemas.model import ModelInfo, ModelListResponse, ModelTrainRequest

router = APIRouter(prefix="/models", tags=["models"])


def ensure_default_model_registered():
    """Ensure the provided matcher_model.pkl is registered in the DB."""
    default_path = settings.DEFAULT_MODEL_PATH
    if not default_path.exists():
        return

    meta = MLAdapter.get_model_metadata(default_path)
    with get_db_ctx() as conn:
        row = conn.execute("SELECT * FROM models WHERE id = 'default_checkpoint'").fetchone()
        if not row:
            conn.execute("""
                INSERT INTO models (
                    id, name, version, path, file_hash, threshold, feature_count,
                    feature_names_json, n_estimators, is_active, metadata_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "default_checkpoint",
                "Supplied Challenge Checkpoint",
                "3.0.0 (Original)",
                str(default_path.resolve()),
                meta.get("file_hash"),
                meta.get("threshold", 0.40),
                meta.get("feature_count", 21),
                json.dumps(meta.get("feature_names", EXPECTED_21_FEATURES)),
                meta.get("n_estimators", 150),
                1,
                json.dumps(meta)
            ))


@router.get("", response_model=ModelListResponse)
def list_models():
    ensure_default_model_registered()
    models = []
    active_id = None

    with get_db_ctx() as conn:
        rows = conn.execute("SELECT * FROM models ORDER BY created_at DESC").fetchall()
        for r in rows:
            is_act = bool(r["is_active"])
            if is_act:
                active_id = r["id"]
            models.append(ModelInfo(
                id=r["id"],
                name=r["name"],
                version=r["version"],
                path=r["path"],
                file_hash=r["file_hash"],
                threshold=r["threshold"],
                feature_count=r["feature_count"],
                feature_names=json.loads(r["feature_names_json"] or "[]"),
                n_estimators=r["n_estimators"],
                is_active=is_act,
                metadata=json.loads(r["metadata_json"] or "{}"),
                created_at=str(r["created_at"])
            ))

    return ModelListResponse(models=models, active_model_id=active_id)


@router.get("/{model_id}", response_model=ModelInfo)
def get_model_details(model_id: str):
    ensure_default_model_registered()
    with get_db_ctx() as conn:
        r = conn.execute("SELECT * FROM models WHERE id = ?", (model_id,)).fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Model not found")
        
        return ModelInfo(
            id=r["id"],
            name=r["name"],
            version=r["version"],
            path=r["path"],
            file_hash=r["file_hash"],
            threshold=r["threshold"],
            feature_count=r["feature_count"],
            feature_names=json.loads(r["feature_names_json"] or "[]"),
            n_estimators=r["n_estimators"],
            is_active=bool(r["is_active"]),
            metadata=json.loads(r["metadata_json"] or "{}"),
            created_at=str(r["created_at"])
        )


@router.post("/active/{model_id}")
def set_active_model(model_id: str):
    with get_db_ctx() as conn:
        conn.execute("UPDATE models SET is_active = 0")
        cur = conn.execute("UPDATE models SET is_active = 1 WHERE id = ?", (model_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Model not found")
    return {"status": "success", "active_model_id": model_id}
