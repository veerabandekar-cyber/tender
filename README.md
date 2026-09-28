# ASTTC Tender Intelligence Portal

## Local demo startup

This project has a React/Vite frontend and a FastAPI backend. For the fastest Windows demo, run `run_local_windows.bat` from the project root. It opens:

- Frontend: http://127.0.0.1:8080
- Backend: http://127.0.0.1:8000/docs

The frontend automatically uses the local backend when opened on localhost/127.0.0.1. It will not silently fall back to the production API or to mock login data.

## Demo authentication

Any syntactically valid `@analyticasofttech.com` email can sign in with any non-empty password. This is intentionally scoped to the requested client-demo domain. Other domains are rejected.

Registration checks the database first; an existing account returns the exact message **User already registered**.

## Tender discovery

Tender discovery collects public metadata first and applies keyword search afterward. It does not use Bing/search-engine PDF discovery, fake tender seeds, random values, EMD-based value estimation, or invented dates/references.

The crawler uses official portal listing pages and isolates failures per portal. It does not bypass CAPTCHA, Cloudflare, login walls, or other access controls. If a listing is public but its detail/document is protected, any title/reference visible on the public listing can still be stored with the official source URL. If the public listing itself is protected, the portal is reported as unavailable instead of fabricating records.

Missing tender values are stored as null and displayed as **Not published**.

## Before client demo

1. Start PostgreSQL (or use the configured database).
2. Run `run_local_windows.bat`.
3. Open http://127.0.0.1:8080.
4. Sign in with any `@analyticasofttech.com` email and a password.
5. Click **Run Tender Discovery**.
6. Review **Settings → scraper logs** for portal-by-portal results.

The manual tender action is retained as an explicit CRM function; discovered tenders are source-labelled separately.
