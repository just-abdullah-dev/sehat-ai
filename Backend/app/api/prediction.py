from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.scan import ModelType
from app.schemas.prediction import PredictionResponse
from app.services.prediction import PredictionService

router = APIRouter(prefix="/predict", tags=["Prediction"])


@router.post("/", response_model=PredictionResponse)
async def predict(
    file: UploadFile = File(..., description="X-ray image file"),
    model: str = Query(..., description="Model type: 'tb' or 'pneumonia'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Run disease prediction on uploaded X-ray image.

    Args:
        file: X-ray image file (JPG/PNG, max 10MB)
        model: Model type to use ('tb' or 'pneumonia')
        current_user: Authenticated user
        db: Database session

    Returns:
        Prediction results with confidence score

    Raises:
        HTTPException 400: If file validation fails or invalid model type
        HTTPException 401: If user is not authenticated
        HTTPException 500: If prediction fails
    """
    # Validate model type
    try:
        model_type = ModelType(model.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid model type. Must be 'tb' or 'pneumonia'"
        )

    # Process prediction
    try:
        scan_record = await PredictionService.process_prediction(
            file=file,
            model_type=model_type,
            user=current_user,
            db=db
        )

        # Generate response message
        if scan_record.result.value == "Positive":
            message = f"{model_type.value.upper()} detected with {scan_record.confidence:.2%} confidence"
        else:
            message = f"No {model_type.value.upper()} detected. Scan appears normal with {scan_record.confidence:.2%} confidence"

        return PredictionResponse(
            scan_id=scan_record.id,
            result=scan_record.result,
            confidence=scan_record.confidence,
            processing_time=scan_record.processing_time,
            model_used=scan_record.model_used,
            file_url=scan_record.file_url,
            message=message
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )
