#!/usr/bin/env bash
set -e
echo "========================================================"
echo " EntityMatch — Business Entity Resolution Platform"
echo "========================================================"
echo "Starting backend at http://127.0.0.1:8000 ..."
cd "$(dirname "$0")/.."
python3 -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
