from pydantic import BaseModel
from app.models.scan import ModelType, PredictionResult


class PredictionResponse(BaseModel):
    """Schema for prediction response"""
    scan_id: int
    result: PredictionResult
    confidence: float
    processing_time: float
    model_used: ModelType
    file_url: str
    message: str

    class Config:
        from_attributes = True
