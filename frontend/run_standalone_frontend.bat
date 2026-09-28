@echo off
echo.
echo ==================================================
echo    SalesConnect STANDALONE Frontend
echo ==================================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo [!] node_modules not found. Installing dependencies...
    call npm install
)

echo Starting Frontend at http://localhost:5173...
npm run dev

pause
