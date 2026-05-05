import logging
from fastapi import APIRouter, UploadFile, File

from app.ml.predictor import predictor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/debug", tags=["Debug"])

# Make sure it's exactly this — field name must be "file"
@router.post("/pneumonia/")
async def debug_pneumonia(
    file: UploadFile = File(...),   # ← must be "file", not "image" or "upload"
):
# @router.post("/pneumonia/")
# async def debug_pneumonia(
#     file: UploadFile = File(...),
# ):
    """
    Debug endpoint — returns raw sigmoid score and threshold.
    Remove before production / FYP demo.
    """
    image_bytes = await file.read()
    result = predictor.debug_predict(image_bytes)
    logger.info(f"DEBUG pneumonia — {result}")
    return result