# ML Challenge 2026: Business Entity Resolution Solution Template

**Team Name:** EntityMatch Team  
**Team Members:** Parthiv & Team  
**Submission Date:** 2026-09-30  

---

## 1. Executive Summary
Our solution, **EntityMatch**, delivers a scalable, high-precision entity resolution pipeline designed specifically for the Amazon ML Challenge 2026. The approach combines a two-stage multi-index blocking architecture (country partitioning, selective token inverted index, and 4-gram prefix keys) with a Gradient Boosted Decision Tree (XGBoost) scoring model operating over a 21-dimensional pairwise feature vector. The system optimizes the official macro $F_{0.5}$ metric with a precision-biased decision threshold ($\tau^* = 0.40$), successfully protecting singletons (1.0 vs 0.0 penalty) while supporting one-to-many matches across heterogeneous sources with zero external lookups.

---

## 2. Methodology

### 2.1 Problem Analysis
Analysis of the challenge records revealed several major noise and structural characteristics across `Source 1` (reference), `Source 2`, and `Source 3`:
- **Name Noise:** Heavy use of abbreviations (*Corp vs Corporation, Pvt Ltd vs Private Limited, Sarl vs Société à responsabilité limitée*), punctuation variations (`&` vs `and`), phonetic transliterations in Indian entities, and word-order transpositions.
- **Address Irregularities:** Fragmented addresses missing PIN/postal codes, municipal numbering variances, street abbreviations (*Rd vs Road, St vs Street, Ave vs Avenue, Rue vs r.*), and landmark references (*Near SBI ATM*).
- **Open-Set Country Domain:** Training data spans `US` and `India`, while the test set introduces `France`. Country was treated strictly as an open-set string label; Unicode `NFKD` decomposition normalizes diacritics (*é, è, ê -> e*) to ensure seamless zero-shot generalization to French entities.
- **Singleton Dominance:** Over 55% of Source 1 entities have zero matching records in Sources 2 or 3. Under macro $F_{0.5}$, falsely predicting any match for a singleton immediately incurs a 0.0 score, making false-positive elimination paramount.

### 2.2 Solution Strategy
- **Approach Type:** Multi-Index Inverted Blocking + XGBoost Pairwise Classifier + Dynamic Threshold Optimization.
- **Core Innovation:**
  1. Strict candidate-match auditability: every candidate scored by the ML model is recorded, and final matches are a strict subset of candidate pairs.
  2. Bounded-memory streaming execution protecting system RAM (< 16 GB).
  3. Elimination of arbitrary truncation: allows legitimate 1-to-many business branches across both Source 2 and Source 3.

---

## 3. Candidate Generation (Blocking)
To reduce the $O(N \times M)$ pairwise comparison space ($2.2\text{M} \times 7.7\text{M} \approx 1.7 \times 10^{13}$ pairs) to a computationally tractable candidate pool:
- **Blocking Keys:**
  1. *Country Partition:* Hard partitioning by country label to eliminate cross-country comparisons.
  2. *Selective Inverted Token Index:* Cleaned alphanumeric tokens (length $\ge 2$) with frequency capping (< 5,000 occurrences per token) to exclude generic business stopwords (*enterprises, group, solutions, services, holdings*).
  3. *4-Gram Prefix Fallback:* Used when queries lack selective tokens to ensure recall on rare or short names.
- **Candidate Pool Capping:** Top-$K$ candidate ranking per query (default $K=10$), re-ranked using rapid character equality and numeric token overlap boosts.
- **Candidate Recall Guarantee:** On the held-out validation split, this blocking strategy achieves a **99.98% reduction ratio** with an estimated **86.4% candidate recall ceiling**.

---

## 4. Matching Model

### 4.1 Features Used (21 Pairwise Features)
1. `name_jaccard`: Token Jaccard similarity of cleaned business name tokens.
2. `name_dice`: Sørensen–Dice coefficient on name tokens.
3. `name_char_jaccard`: Character 3-gram Jaccard overlap on sanitized names.
4. `name_seq_ratio`: SequenceMatcher pattern similarity ratio.
5. `name_exact`: Binary indicator (1.0) for exact sanitized string match.
6. `name_first_match`: Binary indicator (1.0) if leading brand tokens match.
7. `name_len_diff`: Absolute character length disparity.
8. `name_len_ratio`: Ratio of shorter to longer name string.
9. `addr_jaccard`: Token Jaccard similarity of normalized addresses.
10. `addr_dice`: Sørensen–Dice coefficient on address tokens.
11. `addr_char_jaccard`: Character 3-gram overlap on addresses.
12. `addr_seq_ratio`: SequenceMatcher ratio on addresses.
13. `addr_len_diff`: Absolute character length disparity between addresses.
14. `addr_len_ratio`: Length ratio of address strings.
15. `shared_nums`: Count of shared numeric tokens (postal codes, street numbers).
16. `num_jaccard`: Jaccard similarity over extracted numeric sets.
17. `has_num_match`: Binary indicator for at least one identical numeric token.
18. `combined_jaccard`: Joint token Jaccard over union of name and address words.
19. `geom_mean_sim`: Geometric mean of name Jaccard and address Jaccard.
20. `target_source_num`: Source indicator (2.0 for Source 2, 3.0 for Source 3).
21. `same_country`: Binary flag for identical country string.

### 4.2 Model Type & Decision Threshold
- **Classifier:** XGBoost (`XGBClassifier`, 150 trees, max_depth=6, learning_rate=0.08, subsample=0.8, colsample_bytree=0.8, scale_pos_weight=1.5, binary:logistic).
- **Threshold Calibration:** Stored checkpoint decision threshold is calibrated at **$\tau^* = 0.40$**. Candidate pairs with $P(\text{match}) \ge 0.40$ are accepted into `matching_results.tsv`.

---

## 5. Results & Error Analysis

### 5.1 Validation Metrics (Held-Out Split)
- **Macro $F_{0.5}$ Score:** **0.7845**
- **Singleton Accuracy:** **92.3%** (13,706 / 14,850 correctly identified empty)
- **Candidate Recall Ceiling:** **86.4%**
- **Reduction Ratio:** **99.98%**

### 5.2 Country Breakdown
- **United States:** Macro $F_{0.5} = 0.7920$, Singleton Acc = 92.8%
- **India:** Macro $F_{0.5} = 0.7770$, Singleton Acc = 91.8%
- **France (Zero-Shot):** Processed cleanly through accent-stripping and French legal form normalization (*SARL, SCI, SA, SAS, Rue, Boulevard*).

### 5.3 Error Analysis
- **False Merges (False Positives):** Occurred primarily in multi-tenant commercial plazas and shopping centers where distinct retail stores shared identical street addresses and numeric postal codes. The precision-heavy $F_{0.5}$ penalty successfully minimizes these by prioritizing name token agreement.
- **Missed Matches (False Negatives):** Occurred when a business underwent a major DBA/trade name change without overlapping brand tokens, or when addresses lacked both street name and PIN code.

---

## 6. Conclusion
The EntityMatch solution demonstrates an efficient, interpretable, and reproducible machine learning pipeline that satisfies all Amazon ML Challenge constraints. By pairing multi-index token blocking with an XGBoost classifier optimized for the macro $F_{0.5}$ objective, the model achieves high precision while preserving candidate auditability and zero external data dependency.

---

## Appendix

### A. Code Artefacts & Reproduction
The self-contained reproduction code ships under `code/business_entity_resolution/`:
- `src/config.py`: Path configurations and hyperparameters.
- `src/preprocess.py`: Unicode accent normalization and legal suffix stripping.
- `src/blocking.py`: High-throughput multi-index candidate blocker.
- `src/features.py`: 21-dimensional pairwise feature extractor.
- `src/model.py`: XGBoost matcher and threshold optimizer.
- `src/evaluate.py`: Macro $F_{0.5}$ metric calculation.
- `src/pipeline.py`: End-to-end training and inference orchestrator.
- `run_saved_model.py`: Standalone saved model inference runner.
- `matcher_model.pkl`: Verified 150-tree XGBoost checkpoint.

**Reproduction Commands:**
```bash
# 1. Install dependencies
pip install -r code/business_entity_resolution/requirements.txt

# 2. Run inference with saved model
python code/business_entity_resolution/run_saved_model.py \
    --model code/business_entity_resolution/matcher_model.pkl \
    --output-dir output \
    --limit 0

# 3. Validate submission format
python utils/validate_submission.py \
    --matching output/matching_results.tsv \
    --candidate output/candidate_pairs.tsv \
    --test-dir dataset/test \
    --check-ids
```

### B. Hardware & Resource Measurement
- **Processor:** AMD Ryzen 5 HS (CPU execution fully validated; multi-threaded with `n_jobs=-1`).
- **Memory Footprint:** Peak RAM measured under 4.2 GB during full streaming inference, comfortably within 16 GB system memory limits.
- **Parameter Count:** < 500,000 parameters across 150 boosted trees (well within the 8 Billion parameter competition ceiling).
- **License:** Open-source Apache 2.0 / MIT compliant.
