from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class ModelType(str, enum.Enum):
    """Enum for ML model types"""
    TB = "tb"
    PNEUMONIA = "pneumonia"


class PredictionResult(str, enum.Enum):
    """Enum for prediction results"""
    NORMAL = "Normal"
    POSITIVE = "Positive"


class ScanHistory(Base):
    """Scan history model to store prediction results"""

    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_url = Column(String, nullable=False)
    model_used = Column(Enum(ModelType), nullable=False)
    result = Column(Enum(PredictionResult), nullable=False)
    confidence = Column(Float, nullable=False)
    processing_time = Column(Float)  # Time taken for inference in seconds
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship with user
    user = relationship("User", back_populates="scans")

    def __repr__(self):
        return f"<ScanHistory(id={self.id}, user_id={self.user_id}, model={self.model_used}, result={self.result})>"
