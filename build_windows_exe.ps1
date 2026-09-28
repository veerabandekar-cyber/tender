$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command py -ErrorAction SilentlyContinue)) { throw "Python launcher 'py' not found." }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js not found." }

if (-not (Test-Path "frontend\node_modules")) {
    Push-Location frontend; npm ci --no-audit --no-fund; Pop-Location
}
Push-Location frontend
npm run build
Pop-Location

if (-not (Test-Path "backend\.venv\Scripts\python.exe")) {
    py -m venv backend\.venv
}
& "backend\.venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check -r backend\requirements.txt
& "backend\.venv\Scripts\python.exe" -m pip install -q pyinstaller
& "backend\.venv\Scripts\python.exe" -m pip install -q aiosqlite


& "backend\.venv\Scripts\python.exe" -m PyInstaller --clean --noconfirm "ASTTC_Tender_Portal.spec"

Write-Host ""
Write-Host "EXE created at: dist\ASTTC_Tender_Portal.exe" -ForegroundColor Green
