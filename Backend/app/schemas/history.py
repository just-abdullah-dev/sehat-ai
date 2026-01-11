from pydantic import BaseModel
from datetime import datetime
from typing import List
from app.models.scan import ModelType, PredictionResult


class ScanHistoryResponse(BaseModel):
    """Schema for individual scan history record"""
    id: int
    file_url: str
    model_used: ModelType
    result: PredictionResult
    confidence: float
    processing_time: float
    created_at: datetime

    class Config:
        from_attributes = True


class ScanHistoryList(BaseModel):
    """Schema for list of scan history records"""
    total: int
    scans: List[ScanHistoryResponse]
