import os
import json
import shutil
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Query

from app.config import settings
from app.services.dataset_service import DatasetService
from app.db.duckdb_store import DuckDBStore
from app.schemas.dataset import (
    DatasetInfo,
    DatasetListResponse,
    DatasetValidationResult,
    RegisterFolderRequest
)

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.get("", response_model=DatasetListResponse)
def list_datasets():
    datasets = DatasetService.get_all_datasets()
    active = DatasetService.get_active_dataset()
    return DatasetListResponse(
        datasets=datasets,
        active_dataset_id=active.id if active else None
    )


@router.post("/register-folder", response_model=DatasetInfo)
def register_folder(req: RegisterFolderRequest):
    folder_path = Path(req.folder_path)
    if not folder_path.is_absolute():
        folder_path = (settings.BASE_DIR / folder_path).resolve()
        
    if not folder_path.exists():
        raise HTTPException(status_code=400, detail=f"Folder not found: {req.folder_path}")

    try:
        info = DatasetService.register_directory(folder_path, name=req.name)
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate", response_model=DatasetValidationResult)
def validate_dataset(path: Optional[str] = None):
    target_path = Path(path) if path else settings.DATASET_DIR
    if not target_path.is_absolute():
        target_path = (settings.BASE_DIR / target_path).resolve()

    if not target_path.exists():
        raise HTTPException(status_code=400, detail=f"Target path does not exist: {target_path}")

    return DatasetService.validate_dataset_directory(target_path)


@router.post("/active/{dataset_id}")
def set_active(dataset_id: str):
    success = DatasetService.set_active_dataset(dataset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"status": "success", "active_dataset_id": dataset_id}


@router.get("/preview/{dataset_id}/{table_name}")
def preview_table(
    dataset_id: str,
    table_name: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    country: Optional[str] = None
):
    datasets = DatasetService.get_all_datasets()
    ds = next((d for d in datasets if d.id == dataset_id), None)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    ds_path = Path(ds.path)
    
    # Map friendly table names
    table_files = {
        "train_source1": "train/train_source1.tsv",
        "train_source2": "train/train_source2.tsv",
        "train_source3": "train/train_source3.tsv",
        "train_ground_truth": "train/train_ground_truth.tsv",
        "test_source1": "test/test_source1.tsv",
        "test_source2": "test/test_source2.tsv",
        "test_source3": "test/test_source3.tsv",
    }
    
    rel = table_files.get(table_name, f"{table_name}.tsv")
    tsv_file = ds_path / rel
    if not tsv_file.exists():
        matches = list(ds_path.rglob(Path(rel).name))
        if matches:
            tsv_file = matches[0]
        else:
            raise HTTPException(status_code=404, detail=f"Table file not found: {table_name}")

    offset = (page - 1) * page_size
    res = DuckDBStore.query_tsv(
        tsv_file,
        search_query=search,
        country_filter=country,
        offset=offset,
        limit=page_size
    )
    
    total = res["total"]
    total_pages = max(1, (total + page_size - 1) // page_size)
    
    return {
        "dataset_id": dataset_id,
        "table_name": table_name,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "rows": res["rows"]
    }
