# ASTTC Tender Intelligence Portal (TIP) & Product Catalogue

A full-stack, enterprise-grade Tender Intelligence Platform and Product Catalogue built for **Analytica SoftTech**. It automates multi-portal tender discovery across Indian public procurement portals (CPPP, GeM, DAE, BARC, IGCAR, TIFR), matches high-probability opportunities against analytical instrument categories, and delivers real-time analytics, Excel reporting, and automated digest emails.

---

## 🌟 Key Features

- **Automated Multi-Portal Discovery**:
  - Live scraping across **CPPP (Central Public Procurement Portal)**, **GeM (Government e-Marketplace)**, **DAE (Department of Atomic Energy - BARC, IGCAR, TIFR)**, and state portals.
  - Asynchronous background execution with live status polling and auto-refreshing dashboard.
  - Zero-fabrication policy: Real procurement records only with source URLs preserved.

- **Intelligent Keyword & Category Matching**:
  - Rule-based & regex-driven classification for analytical instruments (*Mass Spectrometry, Gas Analysers, Optical Microscopes, Profilometers, Radiation Safety, IoT Sensors, etc.*).
  - Target organization categorization (*DAE, IIT, NIT, CSIR, ISRO, Defense, Central Universities*).

- **Dynamic Analytics Dashboard**:
  - Real-time KPIs (*Total Active Tenders, Added Today, Closing This Week, Total Value, Opportunity Breakdown*).
  - Interactive charts (*Status Distribution, 4-Week Closing Timeline bins, Top 5 Organizations*).
  - Responsive greeting and quick portal discovery shortcuts.

- **Enterprise Reporting & Exporting**:
  - Fast, memory-optimized Excel export (`.xlsx`) handling 25,000+ tenders in under 2 seconds with sanitized strings.
  - Automated tender digest email generation with socket timeout resilience.

- **Standalone Windows Distribution**:
  - Self-contained, zero-configuration Windows `.exe` built with PyInstaller.
  - Auto port discovery (`8000`, `8001`...) with automatic default browser launch.
  - Embedded SQLite database engine (`asttc.db`) pre-seeded with product catalogues and keywords.

---

## 🏗️ Architecture & Tech Stack

```
tender-main/
├── backend/
│   ├── app/
│   │   ├── common/           # Scrapers, Classifier, Email, Auth Dependencies
│   │   ├── modules/
│   │   │   ├── catalogue/    # Product Catalogue & Provider APIs
│   │   │   ├── discovery/    # Multi-portal Scraper & Pipeline Service
│   │   │   ├── organizations/# Buyer Organizations Directory
│   │   │   ├── reports/      # Summary KPIs, Charts, Excel & Email Reports
│   │   │   ├── tenders/      # Tender Tracker CRUD & Filtering
│   │   │   └── userauth/     # JWT Auth, Signup, OTP, Password Recovery
│   │   ├── config.py         # App & Environment Settings
│   │   ├── database.py       # Async SQLAlchemy Session & Engine
│   │   ├── main.py           # FastAPI Application & SPA Static Mount
│   │   └── seed.py           # Database Seeder (Categories, Products, Orgs)
│   └── tests/                # 14/14 Pytest Test Suite
│
├── frontend/
│   ├── src/
│   │   ├── components/       # UI Components, Modals, Navbar, ProtectedRoute
│   │   ├── context/          # AuthContext (Auto-demo session & state)
│   │   ├── hooks/            # useDashboard, React Query hooks
│   │   ├── lib/              # API Client (Dynamic Origin), Auth helpers
│   │   └── pages/            # Dashboard, TenderTracker, Detail, Reports, Orgs
│   └── dist/                 # Production React Build
│
├── dist/                     # Standalone Windows Executable (ASTTC_Tender_Portal.exe)
├── ASTTC_Tender_Portal.spec  # PyInstaller Specification
├── BUILD_EXE_WINDOWS.bat     # One-click Windows Executable Builder
├── build_windows_exe.ps1     # PowerShell Builder Script
├── run_local_windows.bat     # Local Development Launcher
└── docker-compose.yml        # Docker Containerization
```

---

## 🚀 Getting Started

### Option 1: Run the Standalone Windows Executable (Zero Setup)
1. Navigate to the `dist/` directory or extract `ASTTC_Tender_Portal_Windows_x64.zip`.
2. Double-click **`ASTTC_Tender_Portal.exe`**.
3. The server will initialize and automatically open `http://127.0.0.1:8000` in your web browser.

---

### Option 2: Local Development Setup

#### Prerequisites
- **Python 3.10+** (with `pip` and `venv`)
- **Node.js 18+** and `npm`

#### 1. Quick Start (Windows)
Double-click `run_local_windows.bat` or run:
```powershell
.\run_local_windows.ps1
```

#### 2. Manual Start

**Backend:**
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

- **Frontend App**: `http://localhost:5173` (or `http://localhost:8080`)
- **Backend API & Swagger Docs**: `http://127.0.0.1:8000/docs`

---

## 🔨 Rebuilding the Standalone Windows `.exe`

To compile any new changes into a fresh standalone binary:
```cmd
BUILD_EXE_WINDOWS.bat
```
or via PowerShell:
```powershell
.\build_windows_exe.ps1
```
The compiled output is placed in `dist\ASTTC_Tender_Portal.exe`.

---

## 🧪 Testing

Run backend unit and integration tests:
```bash
pytest
```
*Current test status: 14 passed (100% test suite green).*

---

## 🔐 Authentication & Roles

- **Demo Domain Access**: All `@analyticasofttech.com` emails are automatically authenticated.
- **Default Demo Account**:
  - **Email**: `admin@analyticasofttech.com`
  - **Password**: `demo123`
- **Security Features**:
  - JWT Bearer Token validation.
  - Password hashing with Bcrypt.
  - Role-based permissions (Sales Manager, Executive, Admin).

---

## 📄 License & Ownership
Copyright © 2026 **Analytica SoftTech (ASTTC)**. All rights reserved.
