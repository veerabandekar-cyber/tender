$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Write-Host "ASTTC Tender Intelligence Portal - Local Demo" -ForegroundColor Cyan

if (-not (Get-Command py -ErrorAction SilentlyContinue)) { throw "Python launcher 'py' not found." }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js not found." }

if (-not (Test-Path "backend\.venv\Scripts\python.exe")) {
    py -m venv backend\.venv
}
& "backend\.venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check -r backend\requirements.txt

if (-not (Test-Path "frontend\node_modules")) {
    Push-Location frontend
    npm ci --no-audit --no-fund
    Pop-Location
}
if (-not (Test-Path "frontend\dist\index.html")) {
    Push-Location frontend
    npm run build
    Pop-Location
}

Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$PSScriptRoot'; & '.\backend\.venv\Scripts\python.exe' -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000"
Start-Sleep -Seconds 3
Start-Process "http://127.0.0.1:8000"
Write-Host "Portal: http://127.0.0.1:8000"
