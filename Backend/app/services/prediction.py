from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.scan import ScanHistory, ModelType
from app.services.storage import StorageService
from app.ml.predictor import predictor


class PredictionService:
    """Service for handling prediction operations"""

    @staticmethod
    async def process_prediction(
        file: UploadFile,
        model_type: ModelType,
        user: User,
        db: Session
    ) -> ScanHistory:
        """
        Process image prediction and save to history.

        Args:
            file: Uploaded X-ray image
            model_type: Type of model to use (tb/pneumonia)
            user: Current authenticated user
            db: Database session

        Returns:
            Created scan history record

        Raises:
            HTTPException: If prediction fails
        """
        # Save uploaded image
        file_path, file_url = await StorageService.save_uploaded_image(file)

        try:
            # Read image bytes for prediction
            image_bytes = StorageService.get_image_bytes(file_path)

            # Run prediction
            prediction_result = predictor.predict(image_bytes, model_type)

            # Create scan history record
            scan_record = ScanHistory(
                user_id=user.id,
                file_url=file_url,
                model_used=model_type,
                result=prediction_result["result"],
                confidence=prediction_result["confidence"],
                processing_time=prediction_result["processing_time"]
            )

            db.add(scan_record)
            db.commit()
            db.refresh(scan_record)

            return scan_record

        except Exception as e:
            # Clean up uploaded file if prediction fails
            StorageService.delete_image(file_path)
            raise e
