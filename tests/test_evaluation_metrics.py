import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.services.evaluation_service import compute_entity_f05, EvaluationService


def test_singleton_scoring_rules():
    """Verify singleton evaluation rules: 1.0 for true empty, 0.0 for false merge."""
    # True singleton + predicted empty -> 1.0
    p, r, f = compute_entity_f05(predicted=set(), truth=set())
    assert f == 1.0
    assert p == 1.0
    assert r == 1.0

    # True singleton + predicted match -> 0.0 (false merge penalty!)
    p, r, f = compute_entity_f05(predicted={"S2-123"}, truth=set())
    assert f == 0.0


def test_non_singleton_scoring_rules():
    """Verify F0.5 formula: (1.25 * P * R) / (0.25 * P + R)."""
    # Ground truth: {S2-001, S3-002}
    # Prediction: {S2-001, S3-002, S2-999}
    # Precision = 2/3 (0.6667), Recall = 2/2 (1.0)
    # Expected F0.5 = (1.25 * 2/3 * 1.0) / (0.25 * 2/3 + 1.0) = (0.8333) / (1.1667) = 0.7143
    truth = {"S2-001", "S3-002"}
    pred = {"S2-001", "S3-002", "S2-999"}

    p, r, f = compute_entity_f05(predicted=pred, truth=truth)
    assert abs(p - 2/3) < 1e-4
    assert abs(r - 1.0) < 1e-4
    assert abs(f - 0.7142857) < 1e-4


def test_empty_prediction_on_true_match():
    """Verify true match entity with empty prediction yields 0.0."""
    truth = {"S2-001"}
    pred = set()

    p, r, f = compute_entity_f05(predicted=pred, truth=truth)
    assert f == 0.0
    assert p == 0.0
    assert r == 0.0
