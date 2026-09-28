import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Boolean, Integer, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database import Base

class SearchKeyword(Base):
    """Keywords configured to search for tenders on GeM, CPPP, and DAE portals."""
    __tablename__ = "search_keywords"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    keyword: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<SearchKeyword(id={self.id}, keyword='{self.keyword}', active={self.is_active})>"


class SearchLog(Base):
    """Execution log of the automated crawler & discovery runs."""
    __tablename__ = "search_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(50), default="Running", nullable=False  # e.g., "Running", "Completed", "Failed"
    )
    tenders_found: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    logs: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    def __repr__(self) -> str:
        return f"<SearchLog(id={self.id}, status='{self.status}', tenders_found={self.tenders_found})>"
