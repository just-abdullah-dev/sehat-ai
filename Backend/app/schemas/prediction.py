from pydantic import BaseModel
from typing import Optional
from app.models.scan import ModelType, PredictionResult
from app.schemas.gradcam import GradCAMReport


class PredictionResponse(BaseModel):
    """Schema for prediction response"""
    scan_id: Optional[int] = None   # None for guest predictions (not saved to DB)
    result: PredictionResult
    confidence: float
    processing_time: float
    model_used: ModelType
    file_url: str
    message: str

    class Config:
        from_attributes = True


class BothPredictionResponse(BaseModel):
    """Schema for combined TB + Pneumonia prediction in a single request"""
    tb: PredictionResponse
    pneumonia: PredictionResponse


class DetailedPneumoniaPredictionResponse(BaseModel):
    """
    Extended pneumonia response from POST /predict/pneumonia/detailed/
    Includes all standard prediction fields plus full Grad-CAM report.
    """

    scan_id: Optional[int] = None
    result: PredictionResult
    confidence: float
    processing_time: float
    model_used: ModelType
    file_url: str
    message: str
    threshold: float

    gradcam: GradCAMReport

    class Config:
        from_attributes = True
