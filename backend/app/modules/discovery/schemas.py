from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class SearchKeywordBase(BaseModel):
    keyword: str = Field(..., min_length=2, max_length=255)
    is_active: bool = True

class SearchKeywordCreate(SearchKeywordBase):
    pass

class SearchKeywordUpdate(BaseModel):
    keyword: Optional[str] = Field(None, min_length=2, max_length=255)
    is_active: Optional[bool] = None

class SearchKeywordResponse(SearchKeywordBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime


class SearchLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    tenders_found: int
    logs: Optional[str] = None
