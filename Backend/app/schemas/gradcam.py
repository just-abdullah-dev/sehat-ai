from typing import List, Optional

from pydantic import BaseModel


class LungZoneAnalysis(BaseModel):
    zone: str
    mean_activation: float
    severity: str
    affected: bool


class GradCAMReport(BaseModel):
    """
    Full Grad-CAM explainability report for pneumonia prediction.
    Images are optional because delivery mode may exclude either format.
    """

    # Base64 PNG images - None when GRADCAM_IMAGE_MODE is "url"
    original_b64: Optional[str] = None
    clahe_b64: Optional[str] = None
    heatmap_b64: Optional[str] = None
    overlay_b64: Optional[str] = None

    # Server file URLs - None when GRADCAM_IMAGE_MODE is "base64"
    original_url: Optional[str] = None
    clahe_url: Optional[str] = None
    heatmap_url: Optional[str] = None
    overlay_url: Optional[str] = None

    # Analysis - always present regardless of mode
    lung_zones: List[LungZoneAnalysis]
    affected_zones: List[str]
    primary_affected_zone: str
    overall_activation: float
    last_conv_layer: str
