# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules

ROOT = Path(SPECPATH)
backend = ROOT / "backend"
frontend_dist = ROOT / "frontend" / "dist"
data_dir = ROOT / "data"

hiddenimports = (
    collect_submodules("app")
    + collect_submodules("uvicorn")
    + collect_submodules("starlette")
    + collect_submodules("fastapi")
    + collect_submodules("pydantic")
    + collect_submodules("pydantic_settings")
    + collect_submodules("openpyxl")
    + [
        "aiosqlite",
        "email_validator",
        "bcrypt",
        "sqlite3",
    ]
)

datas = [
    (str(frontend_dist), "frontend_dist"),
    (str(backend / "app"), "app"),
]

# Bundle the existing demo database.
db_file = data_dir / "asttc.db"
if db_file.exists():
    datas.append((str(db_file), "data"))

a = Analysis(
    [str(backend / "app" / "main.py")],
    pathex=[str(backend)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter"],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="ASTTC_Tender_Portal",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
)