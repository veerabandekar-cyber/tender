import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

class Organization(Base):
    """Organization/Institution details representing potential buyer sites."""
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String(500), unique=True, nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(
        String(255), nullable=False  # e.g., "Research Lab", "University"
    )
    category: Mapped[str] = mapped_column(
        String(255), nullable=False  # e.g., "DAE", "IIT"
    )
    website: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    city: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    state: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    contact_person: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    contact_email: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    contact_phone: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    existing_oems: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list  # List of OEMs installed
    )
    notes: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    tenders: Mapped[list["Tender"]] = relationship(
        "Tender", back_populates="organization", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Organization(id={self.id}, name='{self.name}')>"
