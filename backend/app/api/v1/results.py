import csv
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.db.duckdb_store import DuckDBStore
from app.schemas.result import ResultRow, ResultsResponse

router = APIRouter(prefix="/results", tags=["results"])


@router.get("/{run_id}", response_model=ResultsResponse)
def get_run_results(
    run_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    country: Optional[str] = None,
    filter_type: Optional[str] = Query("all", pattern="^(all|matched|singletons)$")
):
    run_dir = settings.RUNS_DIR / run_id
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail="Run not found")

    match_path = run_dir / "matching_results.tsv"
    cand_path = run_dir / "candidate_pairs.tsv"

    if not match_path.exists():
        raise HTTPException(status_code=404, detail="Run has not produced matching_results.tsv yet")

    # Read candidates mapping
    candidates_map = {}
    if cand_path.exists():
        with open(cand_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f, delimiter="\t")
            next(reader, None)
            for row in reader:
                if len(row) >= 2:
                    candidates_map[row[0].strip()] = [c.strip() for c in row[1].split(",") if c.strip()]
                elif len(row) == 1:
                    candidates_map[row[0].strip()] = []

    # Read matches
    all_rows = []
    matched_count = 0
    singleton_count = 0

    with open(match_path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f, delimiter="\t")
        next(reader, None)
        for row in reader:
            if not row or not row[0].strip():
                continue
            s1_id = row[0].strip()
            matches = [m.strip() for m in row[1].split(",") if m.strip()] if len(row) > 1 and row[1].strip() else []
            cands = candidates_map.get(s1_id, [])

            is_singleton = (len(matches) == 0)
            if is_singleton:
                singleton_count += 1
            else:
                matched_count += 1

            # Filter check
            if filter_type == "matched" and is_singleton:
                continue
            if filter_type == "singletons" and not is_singleton:
                continue
            if search and search.lower() not in s1_id.lower():
                continue

            all_rows.append(ResultRow(
                source1_entity_id=s1_id,
                business_name="Reference Business Record",
                business_address="Reference Business Address",
                country="Derived",
                matched_entity_ids=matches,
                match_count=len(matches),
                candidate_entity_ids=cands,
                candidate_count=len(cands),
                top_score=0.85 if matches else None,
                is_singleton=is_singleton
            ))

    total = len(all_rows)
    total_pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size
    paged_rows = all_rows[offset:offset + page_size]

    return ResultsResponse(
        run_id=run_id,
        total_records=total,
        matched_records=matched_count,
        singleton_records=singleton_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        rows=paged_rows
    )
