@echo off
setlocal
cd /d "%~dp0\.."

echo ========================================================
echo  EntityMatch — Business Entity Resolution Platform
echo ========================================================
echo Working Directory: %CD%

REM Detect Python executable
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

if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python not found. Please ensure Python is installed and in PATH.
    pause
    exit /b 1
)

echo Using Python: %PYTHON_CMD%
echo Launching server on http://127.0.0.1:8000 ...

REM Launch browser once server is ready (wait 4s)
start /b cmd /c "timeout /t 4 /nobreak >nul && start http://127.0.0.1:8000"

REM Set PYTHONPATH for app and ML modules
set "PYTHONPATH=%CD%\backend;%CD%\code\business_entity_resolution;%PYTHONPATH%"

REM Start FastAPI Uvicorn Server
%PYTHON_CMD% -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000

pause
