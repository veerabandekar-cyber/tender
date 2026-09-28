$env:Path = "C:\Users\VERUDI\AppData\Local\Programs\node;" + $env:Path
Write-Host "Starting Frontend Development Server..." -ForegroundColor Cyan
Set-Location -Path .\frontend
npm run dev
