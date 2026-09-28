"""
Portable application configuration.

For local/client demos the default database is SQLite beside the project/EXE,
so PostgreSQL is not required. Production deployments can override
ASTTC_DATABASE_URL.
"""
import os
import sys
from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


def runtime_data_dir() -> Path:
    if configured := os.getenv("ASTTC_DATA_DIR"):
        path = Path(configured)
    else:
        base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parents[2]))
        # When packaged, store writable data beside the executable.
        if getattr(sys, "frozen", False):
            path = Path(sys.executable).resolve().parent / "data"
        else:
            path = base / "data"
    path.mkdir(parents=True, exist_ok=True)
    return path


DEFAULT_DATABASE_URL = f"sqlite:///{(runtime_data_dir() / 'asttc.db').as_posix()}"


class Settings(BaseSettings):
    database_url: str = DEFAULT_DATABASE_URL
    app_name: str = "Tender Intelligence Portal API"
    debug: bool = False
    api_prefix: str = "/api/v1"
    cors_origins: str | list[str] = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ]
    jwt_secret_key: str = "asttc-local-demo-jwt-change-for-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 1440
    gemini_api_key: str | None = None
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    scheduler_enabled: bool = False
    digest_recipient_email: str = "admin@analytica.com"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def get_cors_origins(self) -> list[str]:
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        return self.cors_origins


@lru_cache()
def get_settings() -> Settings:
    return Settings()
