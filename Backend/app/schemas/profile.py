from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class ProfileResponse(BaseModel):
    """Schema for profile response"""
    id: int
    email: str
    username: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    symptoms: Optional[str] = None
    medicines: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    """Schema for profile update request"""
    username: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    symptoms: Optional[str] = None
    medicines: Optional[List[str]] = None
