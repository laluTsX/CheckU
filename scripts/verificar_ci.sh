#!/usr/bin/env bash
# Ejecuta localmente las mismas verificaciones que el pipeline (Linux/macOS/Git Bash).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== [BackEnd] preparacion"
cd "$ROOT/BackEnd"
[ -d .venv ] || python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate
pip install -q -r requirements-dev.txt

echo "== [BackEnd] build"
python -m compileall -q . -x "migrations|venv|.venv"
flake8 . --select=E9,F63,F7,F82 --show-source --statistics
bandit -r . -lll -x ./tests,./migrations,./venv,./.venv -q

echo "== [BackEnd] test"
pytest tests -q --cov=. --cov-fail-under=35

echo "== [Web] preparacion + build"
cd "$ROOT/web" && npm ci && npx tsc --noEmit && npm run build

echo "== [Movil] preparacion + test"
cd "$ROOT/Movil" && npm ci && npx tsc --noEmit && npx jest --ci

echo "VERIFICACION LOCAL OK: el pipeline deberia aprobar."
