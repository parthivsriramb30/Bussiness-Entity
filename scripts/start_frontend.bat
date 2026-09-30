@echo off
echo Starting EntityMatch Frontend on http://127.0.0.1:3000 ...
cd /d "%~dp0\..\frontend"
npm run dev
pause
