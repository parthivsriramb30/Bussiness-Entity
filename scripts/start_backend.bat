@echo off
setlocal
cd /d "%~dp0\.."

set "PYTHON_CMD="
where py >nul 2>nul
if %errorlevel% equ 0 (
    set "PYTHON_CMD=py"
) else (
    where python >nul 2>nul
    if %errorlevel% equ 0 (
        set "PYTHON_CMD=python"
    ) else if exist "C:\Users\Parthiv\AppData\Local\Python\pythoncore-3.14-64\python.exe" (
        set "PYTHON_CMD=C:\Users\Parthiv\AppData\Local\Python\pythoncore-3.14-64\python.exe"
    )
)

echo Starting EntityMatch FastAPI Backend on http://127.0.0.1:8000 ...
echo Working directory: %CD%
%PYTHON_CMD% -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
pause
