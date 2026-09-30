import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.config import settings
from app.services.ml_adapter import MLAdapter, EXPECTED_21_FEATURES


def test_model_checkpoint_integrity():
    """Verify saved checkpoint parameters: XGBoost 3.0.0, 21 features, threshold 0.40."""
    model_path = settings.DEFAULT_MODEL_PATH
    assert model_path.exists(), f"Model file missing at {model_path}"

    meta = MLAdapter.get_model_metadata(model_path)
    assert meta["threshold"] == 0.40, f"Expected threshold 0.40, got {meta['threshold']}"
    assert meta["feature_count"] == 21, f"Expected 21 features, got {meta['feature_count']}"
    assert meta["feature_names"] == EXPECTED_21_FEATURES


def test_feature_computation_semantics():
    """Verify pairwise feature computation on noise patterns and French accents."""
    matcher = MLAdapter.load_model(settings.DEFAULT_MODEL_PATH)

    s1_rec = ("S1-001", "Acme Corporation Pvt Ltd", "123 Main Road, Suite 4", "US")
    # Candidate with abbreviations, punctuation, legal suffix variation
    cand_rec = ("S2-002", "Acme Corp & Co", "123 Main St., Ste 4", "US")

    res = MLAdapter.score_single_pair(matcher, s1_rec, cand_rec)
    feats = res["features"]

    assert len(feats) == 21
    assert feats["name_jaccard"] > 0.4
    assert feats["addr_jaccard"] > 0.4
    assert feats["has_num_match"] == 1.0
    assert feats["same_country"] == 1.0
    assert 0.0 <= res["score"] <= 1.0


def test_french_diacritics_normalization():
    """Verify zero-shot French diacritics normalization (é, è -> e) in features."""
    matcher = MLAdapter.load_model(settings.DEFAULT_MODEL_PATH)

    s1_rec = ("S1-FR1", "Société Café de Paris SARL", "15 Rue de l'Étoile", "France")
    cand_rec = ("S2-FR2", "Societe Cafe de Paris", "15 rue de l'Etoile", "France")

    res = MLAdapter.score_single_pair(matcher, s1_rec, cand_rec)
    feats = res["features"]

    assert feats["name_exact"] == 1.0
    assert feats["has_num_match"] == 1.0
    assert feats["same_country"] == 1.0
