from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from app.config import settings
from app.services.export_service import ExportService

router = APIRouter(prefix="/exports", tags=["exports"])


@router.get("/{run_id}/matching")
def download_matching_results(run_id: str):
    run_dir = settings.RUNS_DIR / run_id
    file_path = run_dir / "matching_results.tsv"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="matching_results.tsv not found for this run")
    return FileResponse(
        path=file_path,
        filename="matching_results.tsv",
        media_type="text/tab-separated-values"
    )


@router.get("/{run_id}/candidate")
def download_candidate_pairs(run_id: str):
    run_dir = settings.RUNS_DIR / run_id
    file_path = run_dir / "candidate_pairs.tsv"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="candidate_pairs.tsv not found for this run")
    return FileResponse(
        path=file_path,
        filename="candidate_pairs.tsv",
        media_type="text/tab-separated-values"
    )


@router.get("/{run_id}/validate")
def validate_run(run_id: str, check_ids: bool = False):
    run_dir = settings.RUNS_DIR / run_id
    match_file = run_dir / "matching_results.tsv"
    cand_file = run_dir / "candidate_pairs.tsv"
    test_dir = settings.DATASET_DIR / "test"

    if not test_dir.exists():
        matches = list(settings.BASE_DIR.rglob("test_source1.tsv"))
        if matches:
            test_dir = matches[0].parent

    report = ExportService.validate_run_outputs(
        matching_path=match_file,
        candidate_path=cand_file if cand_file.exists() else None,
        test_dir=test_dir,
        check_ids=check_ids
    )
    return report


@router.get("/{run_id}/package")
def download_submission_zip(run_id: str, team_name: str = "EntityMatchTeam"):
    run_dir = settings.RUNS_DIR / run_id
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail="Run not found")

    try:
        archive_path = ExportService.create_submission_archive(
            run_dir=run_dir,
            team_name=team_name
        )
        return FileResponse(
            path=archive_path,
            filename=f"{team_name}_submission.zip",
            media_type="application/zip"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
