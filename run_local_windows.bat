@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ================================================
echo   ASTTC Tender Intelligence Portal - Local Demo
echo ================================================
echo.

where py >nul 2>&1
if errorlevel 1 (
  echo ERROR: Python launcher "py" was not found.
  echo Install Python 3.11+ from python.org and enable "Add Python to PATH".
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js was not found.
  echo Install Node.js LTS from nodejs.org, then run this file again.
  pause
  exit /b 1
)

if not exist "backend\.venv\Scripts\python.exe" (
  echo [1/5] Creating Python environment...
  py -m venv backend\.venv
  if errorlevel 1 goto :fail
)

echo [2/5] Checking Python dependencies...
backend\.venv\Scripts\python.exe -m pip install -q --disable-pip-version-check -r backend\requirements.txt
if errorlevel 1 goto :fail

if not exist "frontend\node_modules" (
  echo [3/5] Installing frontend dependencies - FIRST RUN ONLY...
  cd frontend
  call npm ci --no-audit --no-fund
  if errorlevel 1 goto :fail
  cd ..
) else (
  echo [3/5] Frontend dependencies already installed.
)

if not exist "frontend\dist\index.html" (
  echo [4/5] Building frontend - FIRST RUN ONLY...
  cd frontend
  call npm run build
  if errorlevel 1 goto :fail
  cd ..
) else (
  echo [4/5] Frontend build already exists.
)

echo [5/5] Starting the single local server...
echo.
start "ASTTC Tender Portal" cmd /k "cd /d ""%~dp0"" && backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:8000"
echo.
echo Portal: http://127.0.0.1:8000
echo The browser will open automatically.
echo Keep the black server window open while using the portal.
exit /b 0

:fail
echo.
echo STARTUP FAILED. Read the error above.
pause
exit /b 1
