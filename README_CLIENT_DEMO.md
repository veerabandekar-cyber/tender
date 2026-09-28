# ASTTC Tender Intelligence Portal — Client Demo Build

## Fastest Windows launch

Double-click `run_local_windows.bat`.

First run:
- creates `backend/.venv`
- installs Python dependencies
- installs frontend dependencies
- builds the React frontend
- starts ONE FastAPI server on `http://127.0.0.1:8000`
- opens the browser automatically

Later runs skip installation/build steps when they already exist.

## Build a Windows EXE

On Windows, double-click `BUILD_EXE_WINDOWS.bat`.

The result is:
`dist/ASTTC_Tender_Portal.exe`

The EXE bundles the built React frontend and FastAPI backend. It uses a local SQLite database and does not require Node/npm/PostgreSQL at runtime.

## Important

Live tender scraping still depends on each official portal being publicly reachable from the demo computer. CAPTCHA/anti-bot protection is not bypassed. Publicly visible listing metadata is retained where possible.

Do not expose the demo authentication behavior as production authentication; the requested any-password behavior is intentionally a client-demo convenience for `@analyticasofttech.com`.
