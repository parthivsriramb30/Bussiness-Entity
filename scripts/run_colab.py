#!/usr/bin/env python3
"""
Standalone Colab & Headless Runner for EntityMatch.
Can be executed in Google Colab or on any headless Linux/Windows server without starting the web UI.
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

def main():
    parser = argparse.ArgumentParser(description="Headless / Colab EntityMatch Pipeline Runner")
    parser.add_argument("--mode", choices=["sample", "full"], default="sample", help="Run mode")
    parser.add_argument("--sample-size", type=int, default=2000, help="Record count for sample mode")
    parser.add_argument("--top-k", type=int, default=10, help="Top-K candidates per entity")
    parser.add_argument("--team-name", type=str, default="EntityMatchTeam", help="Team name for zip archive")
    args = parser.parse_args()

    print("=========================================================")
    print(" Amazon ML Challenge 2026: Business Entity Resolution")
    print(f" Execution Mode: {args.mode.upper()}")
    print("=========================================================")

    # 1. Run inference using saved model
    ml_script = REPO_ROOT / "code" / "business_entity_resolution" / "run_saved_model.py"
    model_path = REPO_ROOT / "code" / "business_entity_resolution" / "matcher_model.pkl"
    output_dir = REPO_ROOT / "output"

    limit_arg = str(args.sample_size) if args.mode == "sample" else "0"

    print(f"\n[Step 1/3] Running Inference with Saved Model Checkpoint (Limit: {limit_arg})...")
    subprocess.run([
        sys.executable, str(ml_script),
        "--model", str(model_path),
        "--output-dir", str(output_dir),
        "--limit", limit_arg,
        "--top-k", str(args.top_k)
    ], check=True)

    # 2. Run challenge format validator
    print("\n[Step 2/3] Running Submission Validator...")
    validator = REPO_ROOT / "utils" / "validate_submission.py"
    matching_tsv = output_dir / "matching_results.tsv"
    cand_tsv = output_dir / "candidate_pairs.tsv"
    test_dir = REPO_ROOT / "dataset" / "test"

    val_res = subprocess.run([
        sys.executable, str(validator),
        "--matching", str(matching_tsv),
        "--candidate", str(cand_tsv),
        "--test-dir", str(test_dir)
    ])

    if val_res.returncode == 0:
        print("\n[Step 3/3] Packaging Submission ZIP...")
        from package_submission import create_submission_zip
        create_submission_zip(team_name=args.team_name)
        print(f"\nSUCCESS: Created {args.team_name}_submission.zip ready for portal upload.")
    else:
        print("\nNote: Sample runs will show missing S1 entities against full test set.")
        print("To generate full submission, run with: python scripts/run_colab.py --mode full")

if __name__ == "__main__":
    main()
