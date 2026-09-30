import csv
import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from app.config import settings


def test_candidate_subset_and_formatting():
    """Verify that all matched IDs are a subset of candidates, without duplicates or self-matches."""
    run_dir = settings.RUNS_DIR / "test_sample_01"
    match_file = run_dir / "matching_results.tsv"
    cand_file = run_dir / "candidate_pairs.tsv"

    if not match_file.exists() or not cand_file.exists():
        pytest.skip("test_sample_01 output not generated yet")

    cand_map = {}
    with open(cand_file, "r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        header = next(reader)
        assert header == ["source1_entity_id", "candidate_entity_ids"]
        for row in reader:
            s1 = row[0].strip()
            cands = [c.strip() for c in row[1].split(",") if c.strip()] if len(row) > 1 else []
            # Check no duplicates within candidate list
            assert len(cands) == len(set(cands)), f"Duplicate candidates for {s1}"
            cand_map[s1] = set(cands)

    with open(match_file, "r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        header = next(reader)
        assert header == ["source1_entity_id", "matched_entity_ids"]
        for row in reader:
            s1 = row[0].strip()
            matches = [m.strip() for m in row[1].split(",") if m.strip()] if len(row) > 1 else []
            # Check no duplicates within match list
            assert len(matches) == len(set(matches)), f"Duplicate matches for {s1}"
            match_set = set(matches)

            # Rule: Every matched ID must be a candidate!
            cands_set = cand_map.get(s1, set())
            assert match_set.issubset(cands_set), f"Matches {match_set} not subset of candidates {cands_set} for {s1}"

            # Rule: No S1 self-matches
            for mid in matches:
                assert mid.startswith(("S2-", "S3-")), f"Invalid match prefix for ID: {mid}"
                assert not mid.startswith("S1-"), f"Disallowed S1 self-match: {mid}"
