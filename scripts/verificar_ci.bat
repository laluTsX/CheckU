@echo off
REM Ejecuta localmente las mismas verificaciones que el pipeline (Windows).
setlocal
set ROOT=%~dp0..

echo == [BackEnd] preparacion
cd /d "%ROOT%\BackEnd"
if not exist .venv python -m venv .venv
call .venv\Scripts\activate.bat
pip install -q -r requirements-dev.txt || goto :error

echo == [BackEnd] build
python -m compileall -q . -x "migrations|venv|.venv" || goto :error
flake8 . --select=E9,F63,F7,F82 --show-source --statistics || goto :error
bandit -r . -lll -x ./tests,./migrations,./venv,./.venv -q || goto :error

echo == [BackEnd] test
pytest tests -q --cov=. --cov-fail-under=35 || goto :error

echo == [Web] preparacion + build
cd /d "%ROOT%\web"
call npm ci || goto :error
call npx tsc --noEmit || goto :error
call npm run build || goto :error

echo == [Movil] preparacion + test
cd /d "%ROOT%\Movil"
call npm ci || goto :error
call npx tsc --noEmit || goto :error
call npx jest --ci || goto :error

echo VERIFICACION LOCAL OK: el pipeline deberia aprobar.
exit /b 0
:error
echo FALLO LA VERIFICACION. Corrige el error antes de hacer push.
exit /b 1
