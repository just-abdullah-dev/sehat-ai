import logging
import traceback
from typing import Optional
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.scan import ScanHistory, ModelType
from app.services.storage import StorageService
from app.ml.predictor import predictor

logger = logging.getLogger(__name__)


class PredictionService:
    """Service for handling prediction operations"""

    @staticmethod
    def _ensure_chest_xray(image_bytes: bytes) -> None:
        """
        Reject non-chest-X-ray uploads before running disease models.
        If the validator model is unavailable, skip validation gracefully.
        """
        try:
            validation = predictor.validate_chest_xray(image_bytes)
            if not validation["is_chest_xray"]:
                score = validation["score"]
                threshold = validation["threshold"]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Invalid image: not recognized as a chest X-ray. "
                        f"validator_score={score:.4f}, threshold={threshold:.4f}"
                    ),
                )
        except RuntimeError as e:
            logger.warning(f"Chest X-ray validation skipped: {e}")

    @staticmethod
    async def process_prediction(
        file: UploadFile,
        model_type: ModelType,
        user: Optional[User],
        db: Session
    ) -> dict:
        """
        Process image prediction.
        If user is provided, saves result to DB.
        If user is None (guest), runs inference only without saving.

        Args:
            file: Uploaded X-ray image
            model_type: Type of model to use (tb/pneumonia)
            user: Authenticated user, or None for guest predictions
            db: Database session

        Returns:
            Dict with prediction result fields (scan_id is None for guests)

        Raises:
            HTTPException: If prediction fails
        """
        # Save uploaded image
        logger.info(f"Saving uploaded file: {file.filename}")
        file_path, file_url = await StorageService.save_uploaded_image(file)
        logger.info(f"File saved: path={file_path}, url={file_url}")

        try:
            # Read image bytes for prediction
            logger.info(f"Reading image bytes from: {file_path}")
            image_bytes = StorageService.get_image_bytes(file_path)
            logger.info(f"Image bytes read: {len(image_bytes)} bytes")

            logger.info("Validating uploaded image as chest X-ray...")
            PredictionService._ensure_chest_xray(image_bytes)
            logger.info("Chest X-ray validation passed")

            # Run prediction
            logger.info(f"Running {model_type.value} model inference...")
            prediction_result = predictor.predict(image_bytes, model_type, validate_input=False)
            logger.info(f"Inference complete: result={prediction_result['result']}, confidence={prediction_result['confidence']:.4f}")

            if user is not None:
                # Authenticated user — save to database
                logger.info(f"Saving scan record for user_id={user.id}")
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
                logger.info(f"Scan record saved: scan_id={scan_record.id}")

                return {
                    "scan_id": scan_record.id,
                    "result": scan_record.result,
                    "confidence": scan_record.confidence,
                    "processing_time": scan_record.processing_time,
                    "model_used": scan_record.model_used,
                    "file_url": scan_record.file_url,
                }
            else:
                # Guest user — return result without saving
                logger.info("Guest user — skipping DB save")
                return {
                    "scan_id": None,
                    "result": prediction_result["result"],
                    "confidence": prediction_result["confidence"],
                    "processing_time": prediction_result["processing_time"],
                    "model_used": model_type,
                    "file_url": file_url,
                }

        except HTTPException as e:
            logger.warning(f"Prediction rejected — {e.detail}")
            StorageService.delete_image(file_path)
            raise e
        except Exception as e:
            logger.error(f"Prediction service error — {type(e).__name__}: {e}")
            logger.error(traceback.format_exc())
            # Clean up uploaded file if prediction fails
            StorageService.delete_image(file_path)
            raise e

    @staticmethod
    async def process_both_prediction(
        file: UploadFile,
        user: Optional[User],
        db: Session
    ) -> dict:
        """
        Run TB and Pneumonia predictions on a single uploaded image.
        Saves two scan records for authenticated users (one per model).
        """
        logger.info(f"Saving uploaded file for both-model prediction: {file.filename}")
        file_path, file_url = await StorageService.save_uploaded_image(file)
        logger.info(f"File saved: path={file_path}, url={file_url}")

        try:
            logger.info("Reading image bytes...")
            image_bytes = StorageService.get_image_bytes(file_path)
            logger.info(f"Image bytes read: {len(image_bytes)} bytes")

            logger.info("Validating uploaded image as chest X-ray...")
            PredictionService._ensure_chest_xray(image_bytes)
            logger.info("Chest X-ray validation passed")

            logger.info("Running TB model inference...")
            tb_raw = predictor.predict(image_bytes, ModelType.TB, validate_input=False)
            logger.info(f"TB inference complete: result={tb_raw['result']}, confidence={tb_raw['confidence']:.4f}")

            logger.info("Running Pneumonia model inference...")
            pneumonia_raw = predictor.predict(image_bytes, ModelType.PNEUMONIA, validate_input=False)
            logger.info(f"Pneumonia inference complete: result={pneumonia_raw['result']}, confidence={pneumonia_raw['confidence']:.4f}")

            tb_scan_id = None
            pneumonia_scan_id = None

            if user is not None:
                logger.info(f"Saving both scan records for user_id={user.id}")
                tb_record = ScanHistory(
                    user_id=user.id,
                    file_url=file_url,
                    model_used=ModelType.TB,
                    result=tb_raw["result"],
                    confidence=tb_raw["confidence"],
                    processing_time=tb_raw["processing_time"],
                )
                pneumonia_record = ScanHistory(
                    user_id=user.id,
                    file_url=file_url,
                    model_used=ModelType.PNEUMONIA,
                    result=pneumonia_raw["result"],
                    confidence=pneumonia_raw["confidence"],
                    processing_time=pneumonia_raw["processing_time"],
                )
                db.add_all([tb_record, pneumonia_record])
                db.commit()
                db.refresh(tb_record)
                db.refresh(pneumonia_record)
                tb_scan_id = tb_record.id
                pneumonia_scan_id = pneumonia_record.id
                logger.info(f"Scan records saved: tb_scan_id={tb_scan_id}, pneumonia_scan_id={pneumonia_scan_id}")

            return {
                "tb": {
                    "scan_id": tb_scan_id,
                    "result": tb_raw["result"],
                    "confidence": tb_raw["confidence"],
                    "processing_time": tb_raw["processing_time"],
                    "model_used": ModelType.TB,
                    "file_url": file_url,
                },
                "pneumonia": {
                    "scan_id": pneumonia_scan_id,
                    "result": pneumonia_raw["result"],
                    "confidence": pneumonia_raw["confidence"],
                    "processing_time": pneumonia_raw["processing_time"],
                    "model_used": ModelType.PNEUMONIA,
                    "file_url": file_url,
                },
            }

        except HTTPException as e:
            logger.warning(f"Both-prediction rejected — {e.detail}")
            StorageService.delete_image(file_path)
            raise e
        except Exception as e:
            logger.error(f"Both-prediction service error — {type(e).__name__}: {e}")
            logger.error(traceback.format_exc())
            StorageService.delete_image(file_path)
            raise e
