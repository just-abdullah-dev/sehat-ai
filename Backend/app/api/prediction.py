import logging
import traceback
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_optional_current_user
from app.models.user import User
from app.models.scan import ModelType
from app.schemas.gradcam import GradCAMReport, LungZoneAnalysis
from app.schemas.prediction import (
    BothPredictionResponse,
    DetailedPneumoniaPredictionResponse,
    PredictionResponse,
)
from app.services.prediction import PredictionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predict", tags=["Prediction"])


def _build_message(model_label: str, result_value: str, confidence: float) -> str:
    pretty_label = "Pneumonia" if model_label.upper() == "PNEUMONIA" else model_label
    if result_value == "Positive":
        if model_label.upper() == "PNEUMONIA":
            return f"High likelihood of {pretty_label} detected (confidence: {confidence:.2%})"
        return f"{pretty_label} detected with {confidence:.2%} confidence"
    return f"No {pretty_label} detected. Scan appears normal with {confidence:.2%} confidence"


@router.post("/both/", response_model=BothPredictionResponse)
async def predict_both(
    file: UploadFile = File(..., description="X-ray image file"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Run TB and Pneumonia prediction on a single uploaded X-ray image.
    Returns both results in one response. Saves two scan records for authenticated users.
    """
    logger.info(f"Predict-both request — file={file.filename}, user={'id=' + str(current_user.id) if current_user else 'guest'}")

    try:
        result = await PredictionService.process_both_prediction(
            file=file,
            user=current_user,
            db=db
        )

        tb = result["tb"]
        pn = result["pneumonia"]

        tb_result_value = tb["result"].value if hasattr(tb["result"], "value") else tb["result"]
        pn_result_value = pn["result"].value if hasattr(pn["result"], "value") else pn["result"]

        logger.info(f"Both predictions succeeded — TB: {tb_result_value} ({tb['confidence']:.4f}), Pneumonia: {pn_result_value} ({pn['confidence']:.4f})")

        return BothPredictionResponse(
            tb=PredictionResponse(
                scan_id=tb["scan_id"],
                result=tb["result"],
                confidence=tb["confidence"],
                processing_time=tb["processing_time"],
                model_used=tb["model_used"],
                file_url=tb["file_url"],
                message=_build_message("TB", tb_result_value, tb["confidence"]),
            ),
            pneumonia=PredictionResponse(
                scan_id=pn["scan_id"],
                result=pn["result"],
                confidence=pn["confidence"],
                processing_time=pn["processing_time"],
                model_used=pn["model_used"],
                file_url=pn["file_url"],
                message=_build_message("PNEUMONIA", pn_result_value, pn["confidence"]),
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Both-prediction failed — {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@router.post("/", response_model=PredictionResponse)
async def predict(
    file: UploadFile = File(..., description="X-ray image file"),
    model: str = Query(..., description="Model type: 'tb' or 'pneumonia'"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Run disease prediction on uploaded X-ray image.

    Authentication is optional:
    - Authenticated users: result saved to scan history, scan_id returned
    - Guest users (no token): inference runs but result NOT saved to DB, scan_id is null

    Args:
        file: X-ray image file (JPG/PNG, max 10MB)
        model: Model type to use ('tb' or 'pneumonia')
        current_user: Authenticated user or None (guest)
        db: Database session

    Returns:
        Prediction results with confidence score
    """
    logger.info(f"Predict request — model={model}, file={file.filename}, user={'id=' + str(current_user.id) if current_user else 'guest'}")

    # Validate model type
    try:
        model_type = ModelType(model.lower())
    except ValueError:
        logger.warning(f"Invalid model type requested: {model}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid model type. Must be 'tb' or 'pneumonia'"
        )

    # Process prediction
    try:
        logger.info(f"Starting prediction pipeline — model_type={model_type.value}")
        result = await PredictionService.process_prediction(
            file=file,
            model_type=model_type,
            user=current_user,
            db=db
        )
        logger.info(f"Prediction succeeded — result={result['result']}, confidence={result['confidence']:.4f}, time={result['processing_time']:.3f}s")

        # Generate response message
        result_value = result["result"].value if hasattr(result["result"], "value") else result["result"]
        message = _build_message(model_type.value.upper(), result_value, result["confidence"])

        return PredictionResponse(
            scan_id=result["scan_id"],
            result=result["result"],
            confidence=result["confidence"],
            processing_time=result["processing_time"],
            model_used=result["model_used"],
            file_url=result["file_url"],
            message=message
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction failed — {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@router.post("/pneumonia/detailed/", response_model=DetailedPneumoniaPredictionResponse)
async def predict_pneumonia_detailed(
    file: UploadFile = File(..., description="Chest X-ray image file"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Run pneumonia detection with full Grad-CAM explainability report.

    Returns standard prediction fields plus:
    - 4 images (base64 and/or URLs based on GRADCAM_IMAGE_MODE)
    - Lung zone analysis with activation scores and severity
    - Affected zones and primary affected zone
    """
    logger.info(
        f"Detailed pneumonia request - file={file.filename}, "
        f"user={'id=' + str(current_user.id) if current_user else 'guest'}"
    )

    try:
        result = await PredictionService.process_pneumonia_detailed(
            file=file,
            user=current_user,
            db=db,
        )

        result_value = (
            result["result"].value
            if hasattr(result["result"], "value")
            else result["result"]
        )

        g = result["gradcam"]

        return DetailedPneumoniaPredictionResponse(
            scan_id=result["scan_id"],
            result=result["result"],
            confidence=result["confidence"],
            processing_time=result["processing_time"],
            model_used=result["model_used"],
            file_url=result["file_url"],
            threshold=result["threshold"],
            message=_build_message("PNEUMONIA", result_value, result["confidence"]),
            gradcam=GradCAMReport(
                original_b64=g.get("original_b64"),
                clahe_b64=g.get("clahe_b64"),
                heatmap_b64=g.get("heatmap_b64"),
                overlay_b64=g.get("overlay_b64"),
                original_url=g.get("original_url"),
                clahe_url=g.get("clahe_url"),
                heatmap_url=g.get("heatmap_url"),
                overlay_url=g.get("overlay_url"),
                lung_zones=[LungZoneAnalysis(**z) for z in g["lung_zones"]],
                affected_zones=g["affected_zones"],
                primary_affected_zone=g["primary_affected_zone"],
                overall_activation=g["overall_activation"],
                last_conv_layer=g["last_conv_layer"],
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Detailed pneumonia endpoint failed - {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Detailed prediction failed: {str(e)}",
        )
