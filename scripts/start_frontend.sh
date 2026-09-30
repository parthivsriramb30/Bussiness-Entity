#!/usr/bin/env bash
set -e
echo "Starting EntityMatch Frontend on http://127.0.0.1:3000 ..."
cd "$(dirname "$0")/../frontend"
npm run dev
