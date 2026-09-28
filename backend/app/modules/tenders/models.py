import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Numeric, ForeignKey, Enum as SAEnum, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

class TenderStatus(str, enum.Enum):
    NEW = "New"
    UNDER_REVIEW = "Under Review"
    INTERESTED = "Interested"
    BID_SUBMITTED = "Bid Submitted"
    WON = "Won"
    LOST = "Lost"
    CLOSED = "Closed"

class Tender(Base):
    """Core tender record representing a procurement opportunity."""
    __tablename__ = "tenders"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    tender_number: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(
        String(1000), nullable=False
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    department: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    instrument_category: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    portal: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    tender_value: Mapped[float | None] = mapped_column(
        Numeric(15, 2), nullable=True
    )
    bid_start_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    bid_closing_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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
    eligible_oems: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    existing_oem: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    likely_competitors: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    status: Mapped[TenderStatus] = mapped_column(
        SAEnum(TenderStatus), nullable=False, default=TenderStatus.NEW
    )
    action_required: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    source_url: Mapped[str | None] = mapped_column(
        String(1000), nullable=True
    )
    document_url: Mapped[str | None] = mapped_column(
        String(1000), nullable=True
    )
    raw_extracted_data: Mapped[dict | None] = mapped_column(
        JSON, nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        nullable=False, default=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="tenders"
    )

    def __repr__(self) -> str:
        return f"<Tender(id={self.id}, number='{self.tender_number}')>"
