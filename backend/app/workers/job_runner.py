import os
import sys
import csv
import json
import time
import psutil
import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import pandas as pd
import numpy as np

from app.config import settings
from app.db.database import get_db_ctx
from app.db.duckdb_store import DuckDBStore
from app.services.ml_adapter import MLAdapter
from app.services.evaluation_service import EvaluationService

# Ensure ML code is importable
ml_code_dir = str(settings.ML_CODE_DIR.resolve())
if ml_code_dir not in sys.path:
    sys.path.insert(0, ml_code_dir)

from src.blocking import MultiIndexBlocker
from src.features import compute_pairwise_features
from src.model import EntityMatcherModel
from src.pipeline import read_source_records, load_ground_truth_for_s1


def log_message(log_file: Path, message: str):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] {message}\n"
    print(formatted, end="", flush=True)
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(formatted)


def update_job_status(
    job_id: str,
    status: str,
    stage: str,
    processed: int = 0,
    total: int = 0,
    progress: float = 0.0,
    error: Optional[str] = None
):
    mem = psutil.virtual_memory().used / (1024 * 1024)
    cpu = psutil.cpu_percent(interval=None)
    completed_at = datetime.datetime.now().isoformat() if status in ["completed", "failed", "cancelled", "interrupted"] else None
    
    with get_db_ctx() as conn:
        conn.execute("""
            UPDATE jobs SET
                status = ?, stage = ?, processed_count = ?, total_count = ?,
                progress = ?, error_message = ?, memory_mb = ?, cpu_percent = ?,
                completed_at = COALESCE(?, completed_at)
            WHERE id = ?
        """, (status, stage, processed, total, progress, error, mem, cpu, completed_at, job_id))


def is_job_cancelled(job_id: str) -> bool:
    with get_db_ctx() as conn:
        row = conn.execute("SELECT status FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return bool(row and row["status"] == "cancelled")


def execute_inference_job(job_id: str):
    """
    Background worker executing real model inference with atomic progress updates,
    streaming DuckDB writes for 21 features, and full test output generation.
    """
    with get_db_ctx() as conn:
        job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            return

    run_dir = Path(job["run_dir"])
    run_dir.mkdir(parents=True, exist_ok=True)
    log_file = run_dir / "run.log"
    
    config = json.loads(job["config_json"] or "{}")
    sample_size = job["sample_size"]
    mode = job["mode"]
    top_k = config.get("top_k", settings.DEFAULT_TOP_K)
    threshold = config.get("threshold", settings.DEFAULT_THRESHOLD)
    max_matches = config.get("max_matches")

    update_job_status(job_id, "running", "Loading Model Checkpoint", 0, 0, 0.0)
    log_message(log_file, f"=== Starting EntityMatch Inference Job {job_id} ===")
    log_message(log_file, f"Mode: {mode} | Sample limit: {sample_size} | Top-K: {top_k} | Threshold: {threshold}")

    try:
        # 1. Load Model Checkpoint
        model_path = settings.DEFAULT_MODEL_PATH
        if job["model_id"]:
            with get_db_ctx() as conn:
                m_row = conn.execute("SELECT path, threshold FROM models WHERE id = ?", (job["model_id"],)).fetchone()
                if m_row and Path(m_row["path"]).exists():
                    model_path = Path(m_row["path"])

        log_message(log_file, f"Loading model from {model_path}...")
        matcher = MLAdapter.load_model(model_path)
        if threshold is not None:
            matcher.threshold = float(threshold)
        log_message(log_file, f"Model loaded successfully. Features: {len(matcher.feature_names)}, Decision Threshold: {matcher.threshold:.2f}")

        # 2. Determine Dataset Paths
        dataset_dir = settings.DATASET_DIR
        if job["dataset_id"]:
            with get_db_ctx() as conn:
                d_row = conn.execute("SELECT path FROM datasets WHERE id = ?", (job["dataset_id"],)).fetchone()
                if d_row and Path(d_row["path"]).exists():
                    dataset_dir = Path(d_row["path"])

        test_s1_path = dataset_dir / "test" / "test_source1.tsv"
        test_s2_path = dataset_dir / "test" / "test_source2.tsv"
        test_s3_path = dataset_dir / "test" / "test_source3.tsv"

        # Search nested if needed
        if not test_s1_path.exists():
            matches = list(dataset_dir.rglob("test_source1.tsv"))
            if matches:
                test_s1_path = matches[0]
                test_s2_path = matches[0].parent / "test_source2.tsv"
                test_s3_path = matches[0].parent / "test_source3.tsv"

        log_message(log_file, f"Using Test Data from: {test_s1_path.parent}")

        # 3. Index Target Records (S2 and S3)
        update_job_status(job_id, "running", "Indexing Target Sources", 0, 0, 0.05)
        log_message(log_file, f"Indexing target candidates into blocker (top_k={top_k})...")
        
        target_limit = (sample_size * 5) if (mode == "sample" and sample_size) else None
        target_records = []
        for p in [test_s2_path, test_s3_path]:
            if p.exists():
                log_message(log_file, f"Reading {p.name} (limit: {target_limit or 'ALL'})...")
                for r in read_source_records(p, max_records=target_limit):
                    target_records.append(r)

        log_message(log_file, f"Total candidate targets indexed: {len(target_records):,}")
        blocker = MultiIndexBlocker(top_k=top_k)
        blocker.index_target_records(target_records)
        target_dict = {r[0]: (r[1], r[2], r[3]) for r in target_records}
        del target_records

        # 4. Initialize Output Files & DuckDB Store
        DuckDBStore.init_run_store(run_dir)
        cand_out_path = run_dir / "candidate_pairs.tsv"
        match_out_path = run_dir / "matching_results.tsv"

        limit_s1 = sample_size if (mode == "sample" and sample_size) else None
        total_s1 = limit_s1 if limit_s1 else 50000

        update_job_status(job_id, "running", "Running Matching Inference", 0, total_s1, 0.10)
        log_message(log_file, "Running candidate blocking and pairwise ML inference...")

        processed_count = 0
        batch_queries = []
        batch_size = config.get("batch_size", settings.BATCH_SIZE)

        with open(cand_out_path, "w", encoding="utf-8", newline="") as f_cand, \
             open(match_out_path, "w", encoding="utf-8", newline="") as f_match:

            cand_writer = csv.writer(f_cand, delimiter="\t")
            match_writer = csv.writer(f_match, delimiter="\t")

            # Exact challenge headers
            cand_writer.writerow(["source1_entity_id", "candidate_entity_ids"])
            match_writer.writerow(["source1_entity_id", "matched_entity_ids"])

            def process_s1_batch(batch):
                nonlocal processed_count
                scored_records_to_store = []
                cand_rows = []
                match_rows = []
                batch_cands = []
                batch_pairs = []

                for s1_id, name1, addr1, country1 in batch:
                    cands = blocker.retrieve_candidates_for_query(s1_id, name1, addr1, country1)
                    cand_rows.append([s1_id, ",".join(cands)])
                    batch_cands.append((s1_id, name1, addr1, country1, cands))
                    for cid in cands:
                        if cid in target_dict:
                            n2, a2, c2 = target_dict[cid]
                            batch_pairs.append((s1_id, name1, addr1, country1, cid, n2, a2, c2))

                pair_probs = {}
                if batch_pairs:
                    feats_list = []
                    for s1_id, n1, a1, c1, cid, n2, a2, c2 in batch_pairs:
                        f = compute_pairwise_features(n1, a1, c1, s1_id, n2, a2, c2, cid)
                        feats_list.append(f)
                    
                    X = pd.DataFrame(feats_list)[matcher.feature_names]
                    probas = matcher.predict_proba(X)
                    
                    for (s1_id, n1, a1, c1, cid, n2, a2, c2), prob, f_dict in zip(batch_pairs, probas, feats_list):
                        p = float(prob)
                        is_m = p >= matcher.threshold
                        pair_probs[(s1_id, cid)] = p
                        scored_records_to_store.append({
                            "s1_id": s1_id,
                            "s1_name": n1,
                            "s1_addr": a1,
                            "s1_country": c1,
                            "cand_id": cid,
                            "cand_name": n2,
                            "cand_addr": a2,
                            "cand_country": c2,
                            "score": p,
                            "threshold": matcher.threshold,
                            "is_match": is_m,
                            "features": f_dict
                        })

                # Write matches per S1 entity
                for s1_id, n1, a1, c1, cands in batch_cands:
                    matched = [cid for cid in cands if pair_probs.get((s1_id, cid), 0.0) >= matcher.threshold]
                    if max_matches is not None and max_matches > 0:
                        matched = matched[:max_matches]
                    match_rows.append([s1_id, ",".join(matched)])

                cand_writer.writerows(cand_rows)
                match_writer.writerows(match_rows)

                # Insert scored pairs into DuckDB for detailed comparison page
                DuckDBStore.insert_scored_batch(run_dir, scored_records_to_store)

                processed_count += len(batch)
                progress = min(0.95, 0.10 + (0.85 * (processed_count / total_s1)))
                update_job_status(job_id, "running", "Scoring Candidates", processed_count, total_s1, round(progress, 3))

            # Stream Source 1 records
            for s1_id, name1, addr1, country1 in read_source_records(test_s1_path, max_records=limit_s1):
                if is_job_cancelled(job_id):
                    log_message(log_file, "Job cancelled by user.")
                    update_job_status(job_id, "cancelled", "Cancelled", processed_count, total_s1, 0.0)
                    return

                batch_queries.append((s1_id, name1, addr1, country1))
                if len(batch_queries) >= batch_size:
                    process_s1_batch(batch_queries)
                    batch_queries = []
                    log_message(log_file, f"Processed {processed_count:,} Source 1 entities...")

            if batch_queries:
                process_s1_batch(batch_queries)

        # 5. Metadata completion
        meta = {
            "job_id": job_id,
            "mode": mode,
            "sample_size": limit_s1 or "all",
            "processed_count": processed_count,
            "threshold": matcher.threshold,
            "top_k": top_k,
            "matching_results": str(match_out_path),
            "candidate_pairs": str(cand_out_path),
            "completed_at": datetime.datetime.now().isoformat()
        }
        with open(run_dir / "run_metadata.json", "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        log_message(log_file, f"Inference complete! Processed {processed_count:,} Source 1 records.")
        update_job_status(job_id, "completed", "Completed", processed_count, processed_count, 1.0)

    except Exception as e:
        log_message(log_file, f"ERROR: Job failed with exception: {e}")
        import traceback
        log_message(log_file, traceback.format_exc())
        update_job_status(job_id, "failed", "Failed", 0, 0, 0.0, error=str(e))
