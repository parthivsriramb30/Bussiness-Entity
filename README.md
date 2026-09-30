# EntityMatch — Business Entity Resolution Platform

[![Challenge](https://img.shields.io/badge/Amazon%20ML%20Challenge-2026-teal.svg)](https://www.kaggle.com/datasets/gowthamdd/amazon-ml-challenge-2026)
[![Framework](https://img.shields.io/badge/FastAPI-0.142-blue.svg)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/React-19%20%7C%20Vite%206-teal.svg)](https://vitejs.dev/)
[![ML](https://img.shields.io/badge/XGBoost-3.0.0-orange.svg)](https://xgboost.readthedocs.io/)
[![License](https://img.shields.io/badge/License-Apache%202.0%20%2F%20MIT-green.svg)](LICENSE)

A complete, working web application and machine learning solution for the **Amazon ML Challenge 2026: Business Entity Resolution Challenge**.

---

## 1. System Overview

EntityMatch resolves heterogeneous business records from three independent data sources into unified business identities:
- **Source 1 (`S1-`):** The deduplicated reference source.
- **Source 2 (`S2-`) & Source 3 (`S3-`):** Independent, noisy target sources.
- **Matching Cardinality:** Each Source 1 record may match zero, one, or multiple records across Sources 2 and 3.
- **Evaluation Metric:** Precision-heavy macro $F_{0.5}$ per entity, where singletons (zero matches) correctly identified earn 1.0, and any false merge on a singleton yields 0.0.

The application includes:
1. **Interactive Professional Dashboard:** Built with React 19, TypeScript, Vite, and Tailwind CSS (Navy `#0f172a` navigation, clean neutral background, restrained teal accents).
2. **High-Performance Backend:** FastAPI with SQLite for persistent job state and DuckDB for ultra-fast queries over multi-gigabyte TSVs.
3. **Dedicated Job Worker:** Runs long-running blocking and matching pipelines in detached background processes with live streaming logs, progress bars, cancellation, and crash-resilient checkpoints.
4. **Standalone Reproducible ML CLI:** Works completely headless without the web UI.

---

## 2. Repository Structure

```
student_resource/
├── dataset/                                   # Real dataset files (or registered mirror)
│   ├── train/
│   │   ├── train_source1.tsv                 # Reference training records
│   │   ├── train_source2.tsv                 # Source 2 training records
│   │   ├── train_source3.tsv                 # Source 3 training records
│   │   └── train_ground_truth.tsv            # Ground truth match pairs
│   └── test/
│       ├── test_source1.tsv                  # Reference test records (US, India, France)
│       ├── test_source2.tsv                  # Source 2 test targets
│       └── test_source3.tsv                  # Source 3 test targets
├── dataset_placeholders/                     # Backed up header-only starter files for testing
├── code/
│   └── business_entity_resolution/
│       ├── src/
│       │   ├── __init__.py
│       │   ├── config.py                     # Path definitions and hyperparameters
│       │   ├── preprocess.py                 # Diacritics normalization & legal suffix pruning
│       │   ├── blocking.py                   # Multi-index token candidate generator
│       │   ├── features.py                   # 21 pairwise similarity features
│       │   ├── model.py                      # XGBoost matcher and threshold optimizer
│       │   ├── evaluate.py                   # Official macro F0.5 evaluation
│       │   └── pipeline.py                   # End-to-end training and inference orchestrator
│       ├── matcher_model.pkl                 # Original saved checkpoint (21 features, threshold 0.40)
│       ├── run_saved_model.py                # Inference runner using saved weights
│       ├── README.md                         # Upstream ML reproduction docs
│       └── requirements.txt                  # Pinned Python dependencies
├── backend/
│   └── app/
│       ├── main.py                           # FastAPI application entry point
│       ├── config.py                         # Path resolvers from repo root
│       ├── api/v1/                           # REST API routes (datasets, models, jobs, results, etc.)
│       ├── db/                               # SQLite connector & DuckDB storage engine
│       ├── schemas/                          # Pydantic request/response schemas
│       ├── services/                         # Dataset validation, ML adapter, evaluation, exports
│       └── workers/                          # Detached job worker process supervision
├── frontend/
│   ├── src/
│   │   ├── components/                       # Layout, StatusBadge, MetricCard, ProgressBar
│   │   ├── pages/                            # Overview, Datasets, Model, Run, Results, Comparison, etc.
│   │   ├── api/                              # Backend client for /api/v1
│   │   └── types/                            # Complete TypeScript interfaces
│   ├── dist/                                 # Pre-compiled production bundle
│   ├── package.json
│   └── vite.config.ts
├── storage/
│   ├── models/                               # Versioned model checkpoints
│   ├── runs/                                 # Per-run TSVs, DuckDB stores, and execution logs
│   └── entitymatch.db                        # SQLite metadata database
├── utils/
│   └── validate_submission.py                # Official challenge format validator
├── scripts/
│   ├── run_local.bat / run_local.sh          # One-click application launcher
│   ├── start_backend.bat / start_backend.sh  # FastAPI backend service
│   ├── start_frontend.bat / start_frontend.sh# Vite frontend dev server
│   └── run_colab.py                          # Headless / Google Colab runner
├── tests/                                    # Automated pytest suite (14 passing tests)
├── Documentation_template.md                 # Complete methodology write-up
├── package_submission.py                     # Competition ZIP builder
├── docker-compose.yml
├── Dockerfile.backend
└── Dockerfile.frontend
```

---

## 3. Quick Start & Local Execution

### Prerequisites
- **Python:** 3.10+ (tested on Python 3.12 and Python 3.14)
- **Node.js:** v18+ (tested on Node v24)
- **RAM:** Minimum 8 GB (16 GB recommended)
- **OS:** Windows or Linux

### Option A: One-Click Local Launcher (Windows)
Double-click:
```cmd
scripts\run_local.bat
```
This launches the FastAPI server at `http://127.0.0.1:8000` (which serves the compiled React application directly) and opens your browser.

### Option B: Linux / macOS
```bash
chmod +x scripts/*.sh
./scripts/run_local.sh
```

### Option C: Developer Mode (Hot-Reloading)
In terminal 1 (Backend):
```bash
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
In terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```
Open `http://localhost:3000`.

---

## 4. Standalone ML CLI Reproduction (Headless)

The ML workflow can be executed completely independently from the command line without the web server:

### 1. Run Inference Using the Saved Checkpoint
```bash
# Rapid benchmark on 2,000 records:
python code/business_entity_resolution/run_saved_model.py \
    --model code/business_entity_resolution/matcher_model.pkl \
    --output-dir output \
    --limit 2000

# Full test set execution (all 1.7M+ test entities):
python code/business_entity_resolution/run_saved_model.py \
    --model code/business_entity_resolution/matcher_model.pkl \
    --output-dir output \
    --limit 0
```

### 2. Validate Submission Format
```bash
python utils/validate_submission.py \
    --matching output/matching_results.tsv \
    --candidate output/candidate_pairs.tsv \
    --test-dir dataset/test \
    --check-ids
```

### 3. Package Competition Archive
```bash
python package_submission.py --team-name EntityMatchTeam
```

---

## 5. Model Checkpoint Verification

The supplied model checkpoint `code/business_entity_resolution/matcher_model.pkl` was inspected and verified:
- **Framework:** XGBoost `XGBClassifier` (150 trees, max_depth=6, learning_rate=0.08)
- **Feature Vector:** Exactly 21 numerical features matching `src/features.py`:
  1. `name_jaccard`, 2. `name_dice`, 3. `name_char_jaccard`, 4. `name_seq_ratio`, 5. `name_exact`, 6. `name_first_match`, 7. `name_len_diff`, 8. `name_len_ratio`, 9. `addr_jaccard`, 10. `addr_dice`, 11. `addr_char_jaccard`, 12. `addr_seq_ratio`, 13. `addr_len_diff`, 14. `addr_len_ratio`, 15. `shared_nums`, 16. `num_jaccard`, 17. `has_num_match`, 18. `combined_jaccard`, 19. `geom_mean_sim`, 20. `target_source_num`, 21. `same_country`.
- **Stored Threshold:** Calibrated at $\tau^* = 0.40$.
- **Immutability Guarantee:** The checkpoint is never overwritten during inference. New training operations save versioned files under `storage/models/`.

---

## 6. Validation & Test Suite

Run the automated test suite with:
```bash
pytest tests/ -v
```
All 14 tests verify:
- Placeholder detection vs real dataset validation
- Model checkpoint metadata and 21 features
- Multilingual and French accent normalization (*é, è -> e*)
- Exact Macro $F_{0.5}$ per entity and singleton rules (1.0 vs 0.0)
- Candidate-match subset consistency
- All FastAPI REST API endpoints
