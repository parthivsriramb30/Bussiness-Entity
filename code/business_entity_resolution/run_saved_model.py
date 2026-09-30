#!/usr/bin/env python3
"""
Run inference using a saved XGBoost model checkpoint without retraining.
Supports sample/benchmark testing or full test set inference.
Generates output/matching_results.tsv and output/candidate_pairs.tsv.
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path

# Add src to python path
current_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(current_dir))

from src.model import EntityMatcherModel
from src.pipeline import run_test_inference
from src.config import CANDIDATE_PAIRS_PATH, MATCHING_RESULTS_PATH, BLOCKING_TOP_K


def main():
    parser = argparse.ArgumentParser(description="Run inference using saved model checkpoint.")
    parser.add_argument("--model", type=str, default="matcher_model.pkl",
                        help="Path to saved model checkpoint pickle")
    parser.add_argument("--output-dir", type=str, default="../../output",
                        help="Output directory for generated submission TSVs")
    parser.add_argument("--limit", type=int, default=0,
                        help="Record limit for Source 1 (0 or negative means ALL records)")
    parser.add_argument("--top-k", type=int, default=BLOCKING_TOP_K,
                        help="Top-K candidates per entity to retrieve during blocking")
    parser.add_argument("--threshold", type=float, default=None,
                        help="Decision threshold override (if not specified, uses stored threshold)")
    parser.add_argument("--max-matches", type=int, default=None,
                        help="Maximum matches to keep per entity (default: unlimited above threshold)")
    args = parser.parse_args()

    model_arg = Path(args.model)
    if model_arg.is_absolute() and model_arg.exists():
        model_path = model_arg
    elif (Path.cwd() / model_arg).exists():
        model_path = (Path.cwd() / model_arg).resolve()
    elif (current_dir / model_arg).exists():
        model_path = (current_dir / model_arg).resolve()
    else:
        model_path = (Path.cwd() / model_arg).resolve()

    if not model_path.exists():
        print(f"ERROR: Model checkpoint not found at {model_path}", file=sys.stderr)
        sys.exit(1)

    out_arg = Path(args.output_dir)
    if out_arg.is_absolute():
        out_dir = out_arg
    else:
        out_dir = (Path.cwd() / out_arg).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    cand_out = out_dir / "candidate_pairs.tsv"
    match_out = out_dir / "matching_results.tsv"

    print(f"Loading checkpoint from: {model_path}")
    matcher = EntityMatcherModel()
    matcher.load(str(model_path))

    stored_thresh = matcher.threshold
    if args.threshold is not None:
        matcher.threshold = args.threshold
        print(f"Threshold overridden: {stored_thresh} -> {matcher.threshold}")
    else:
        print(f"Using stored threshold: {matcher.threshold}")

    print(f"Model feature count: {len(matcher.feature_names)}")

    limit = args.limit if args.limit > 0 else None
    start_t = time.time()
    run_test_inference(
        matcher=matcher,
        limit_test=limit,
        candidate_output=cand_out,
        matching_output=match_out,
        top_k=args.top_k,
        max_matches=args.max_matches
    )
    elapsed = time.time() - start_t

    # Write completion metadata
    meta = {
        "mode": "full" if limit is None else "sample",
        "sample_size": limit or "all",
        "model_path": str(model_path),
        "threshold": matcher.threshold,
        "top_k": args.top_k,
        "elapsed_seconds": round(elapsed, 2),
        "timestamp": time.time(),
        "candidate_output": str(cand_out),
        "matching_output": str(match_out)
    }
    meta_path = out_dir / "RUN_COMPLETE.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"Run completed successfully in {elapsed:.1f}s. Metadata: {meta_path}")


if __name__ == "__main__":
    main()
