import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db.database import init_db
from app.services.dataset_service import DatasetService
from app.api.v1 import (
    datasets,
    models,
    jobs,
    results,
    comparison,
    evaluation,
    exports,
    audit,
    settings as settings_api
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables
    init_db()

    # Automatically register active dataset if dataset folder exists
    if settings.DATASET_DIR.exists():
        try:
            # Check if any datasets already registered
            existing = DatasetService.get_all_datasets()
            if not existing:
                DatasetService.register_directory(settings.DATASET_DIR, name="Challenge Dataset")
        except Exception as e:
            print(f"Dataset auto-registration note: {e}")

    # Ensure default model registered
    try:
        models.ensure_default_model_registered()
    except Exception as e:
        print(f"Model auto-registration note: {e}")

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Business Entity Resolution Challenge Platform (EntityMatch)",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 routers
app.include_router(datasets.router, prefix=settings.API_V1_STR)
app.include_router(models.router, prefix=settings.API_V1_STR)
app.include_router(jobs.router, prefix=settings.API_V1_STR)
app.include_router(results.router, prefix=settings.API_V1_STR)
app.include_router(comparison.router, prefix=settings.API_V1_STR)
app.include_router(evaluation.router, prefix=settings.API_V1_STR)
app.include_router(exports.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(settings_api.router, prefix=settings.API_V1_STR)


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME, "version": settings.VERSION}

# Mount built frontend SPA if available
frontend_dist = settings.BASE_DIR / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

