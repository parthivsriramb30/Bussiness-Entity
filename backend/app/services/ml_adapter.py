import os
import sys
import csv
import json
import time
import pickle
import hashlib
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any, Callable
import pandas as pd
import numpy as np

from app.config import settings

# Ensure ML code src is importable
ml_code_dir = str(settings.ML_CODE_DIR.resolve())
if ml_code_dir not in sys.path:
    sys.path.insert(0, ml_code_dir)

from src.features import compute_pairwise_features
from src.blocking import MultiIndexBlocker
from src.model import EntityMatcherModel
from src.preprocess import clean_name, clean_address, extract_numbers


EXPECTED_21_FEATURES = [
    "name_jaccard", "name_dice", "name_char_jaccard", "name_seq_ratio",
    "name_exact", "name_first_match", "name_len_diff", "name_len_ratio",
    "addr_jaccard", "addr_dice", "addr_char_jaccard", "addr_seq_ratio",
    "addr_len_diff", "addr_len_ratio", "shared_nums", "num_jaccard",
    "has_num_match", "combined_jaccard", "geom_mean_sim", "target_source_num",
    "same_country"
]


class MLAdapter:
    """
    Adapter interfacing between FastAPI / Job Worker and the reusable XGBoost ML pipeline.
    Preserves exact 21 features, threshold 0.4, and unrolls candidate-level predictions.
    """

    @staticmethod
    def load_model(model_path: Path) -> EntityMatcherModel:
        """
        Safely load model checkpoint and verify its integrity and feature consistency.
        """
        if not model_path.exists():
            raise FileNotFoundError(f"Model checkpoint not found: {model_path}")

        matcher = EntityMatcherModel()
        matcher.load(str(model_path))

        # Check feature consistency
        loaded_features = list(matcher.feature_names)
        if len(loaded_features) != 21:
            print(f"Warning: Expected 21 features, but model has {len(loaded_features)}")

        return matcher

    @staticmethod
    def get_model_metadata(model_path: Path) -> Dict[str, Any]:
        """
        Inspect checkpoint details: trees, threshold, feature names, sha256 hash.
        """
        if not model_path.exists():
            return {}

        with open(model_path, "rb") as f:
            data = pickle.load(f)

        hasher = hashlib.sha256()
        with open(model_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        file_hash = hasher.hexdigest()

        model_obj = data.get("model")
        n_trees = None
        if hasattr(model_obj, "get_booster"):
            try:
                n_trees = model_obj.get_booster().num_boosted_rounds()
            except Exception:
                n_trees = getattr(model_obj, "n_estimators", None)

        threshold = float(data.get("threshold", 0.40))
        feature_names = data.get("feature_names", EXPECTED_21_FEATURES)

        return {
            "path": str(model_path.resolve()),
            "file_hash": file_hash,
            "threshold": threshold,
            "feature_count": len(feature_names),
            "feature_names": feature_names,
            "n_estimators": n_trees,
            "model_class": model_obj.__class__.__name__ if model_obj else "Unknown"
        }

    @staticmethod
    def score_single_pair(
        matcher: EntityMatcherModel,
        s1_record: Tuple[str, str, str, str],  # eid, name, addr, country
        cand_record: Tuple[str, str, str, str]  # eid, name, addr, country
    ) -> Dict[str, Any]:
        """
        Compute 21 features and score a single S1 vs Candidate pair.
        """
        s1_id, s1_name, s1_addr, s1_country = s1_record
        cand_id, cand_name, cand_addr, cand_country = cand_record

        features = compute_pairwise_features(
            s1_name, s1_addr, s1_country, s1_id,
            cand_name, cand_addr, cand_country, cand_id
        )

        df = pd.DataFrame([features])[matcher.feature_names]
        prob = float(matcher.predict_proba(df)[0])
        is_match = prob >= matcher.threshold

        return {
            "score": prob,
            "threshold": matcher.threshold,
            "is_match": is_match,
            "features": features
        }
