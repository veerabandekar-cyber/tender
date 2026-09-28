from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any
from app.modules.tenders.models import TenderStatus
from app.modules.organizations.schemas import OrganizationResponse

class TenderBase(BaseModel):
    tender_number: str = Field(..., max_length=255)
    title: str = Field(..., max_length=1000)
    organization_id: Optional[UUID] = None
    department: Optional[str] = Field(None, max_length=500)
    instrument_category: Optional[str] = Field(None, max_length=255)
    portal: Optional[str] = Field(None, max_length=100)
    tender_value: Optional[float] = None
    bid_start_date: Optional[datetime] = None
    bid_closing_date: Optional[datetime] = None
    contact_person: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    eligible_oems: list[str] = Field(default_factory=list)
    existing_oem: Optional[str] = Field(None, max_length=255)
    likely_competitors: list[str] = Field(default_factory=list)
    status: TenderStatus = TenderStatus.NEW
    action_required: Optional[str] = None
    source_url: Optional[str] = Field(None, max_length=1000)
    document_url: Optional[str] = Field(None, max_length=1000)
    raw_extracted_data: Optional[dict] = None
    is_active: bool = True

class TenderCreate(TenderBase):
    pass

class TenderUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=1000)
    organization_id: Optional[UUID] = None
    department: Optional[str] = Field(None, max_length=500)
    instrument_category: Optional[str] = Field(None, max_length=255)
    portal: Optional[str] = Field(None, max_length=100)
    tender_value: Optional[float] = None
    bid_start_date: Optional[datetime] = None
    bid_closing_date: Optional[datetime] = None
    contact_person: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    eligible_oems: Optional[list[str]] = None
    existing_oem: Optional[str] = Field(None, max_length=255)
    likely_competitors: Optional[list[str]] = None
    status: Optional[TenderStatus] = None
    action_required: Optional[str] = None
    source_url: Optional[str] = Field(None, max_length=1000)
    document_url: Optional[str] = Field(None, max_length=1000)
    raw_extracted_data: Optional[dict] = None
    is_active: Optional[bool] = None

class TenderResponse(TenderBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime
    organization: Optional[OrganizationResponse] = None

class TenderListResponse(BaseModel):
    items: list[TenderResponse]
    total: int

# Resolve circular import for OrganizationDetailResponse
from app.modules.organizations.schemas import OrganizationDetailResponse
OrganizationDetailResponse.model_fields['tenders'].annotation = list[TenderResponse]
OrganizationDetailResponse.model_rebuild()
