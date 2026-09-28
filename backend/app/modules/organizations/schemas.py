from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from typing import Optional, Any

class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=500)
    type: str = Field(..., min_length=2, max_length=255)
    category: str = Field(..., min_length=2, max_length=255)
    website: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=255)
    state: Optional[str] = Field(None, max_length=255)
    contact_person: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    existing_oems: list[str] = Field(default_factory=list)
    notes: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=500)
    type: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=255)
    website: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=255)
    state: Optional[str] = Field(None, max_length=255)
    contact_person: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    existing_oems: Optional[list[str]] = None
    notes: Optional[str] = None

class OrganizationResponse(OrganizationBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Forward references for detail views with tender history
class OrganizationDetailResponse(OrganizationResponse):
    tenders: list[Any] = [] # Resolved dynamically to prevent circular import issues
