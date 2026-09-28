ASTTC Tender Portal - Fast UI + Scraper Fix Patch

This patch is designed to be applied to an ALREADY INSTALLED/RUNNING local copy.
It does NOT require npm install or recreating the Python virtual environment.

Copy/extract these files into the ROOT of your existing ASTTC_Tender_Portal folder,
overwriting the existing files when prompted.

Then:
1. Keep the frontend dependencies you already installed.
2. Restart the backend (Ctrl+C, then start uvicorn again).
3. Restart the frontend (Ctrl+C, then npm run dev -- --host 127.0.0.1 --port 8080).

Changes:
- Tender title is now the primary field in the tender table.
- Shortlist/favorite star with local persistence.
- Shortlist-only view.
- Keyword dropdown/chips and relevance sorting.
- Search across title/reference/org/instrument/raw source data.
- Official source button.
- Missing published values remain "Not published".
- Scraper preserves parsed closing dates instead of discarding them.
- Scraper prioritizes useful linked tender text for titles.
- email-validator added to requirements.
- Tender fetch limit increased to 500 for the demo.
