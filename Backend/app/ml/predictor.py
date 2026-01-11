import time
import numpy as np
from typing import Tuple, Dict
from app.ml.model_loader import model_loader
from app.ml.preprocessing import ImagePreprocessor
from app.models.scan import ModelType, PredictionResult


class Predictor:
    """Prediction engine for TB and Pneumonia detection"""

    def __init__(self):
        self.preprocessor = ImagePreprocessor(target_size=(224, 224))

    def predict(
        self,
        image_bytes: bytes,
        model_type: ModelType
    ) -> Dict[str, any]:
        """
        Run prediction on uploaded image.

        Args:
            image_bytes: Raw image bytes
            model_type: Type of model to use (tb or pneumonia)

        Returns:
            Dictionary containing:
                - result: PredictionResult (Normal/Positive)
                - confidence: float (0-1)
                - processing_time: float (seconds)

        Raises:
            ValueError: If model type is invalid or prediction fails
        """
        start_time = time.time()

        try:
            # Preprocess image
            processed_image = self.preprocessor.preprocess_image(image_bytes)

            # Get appropriate model
            if model_type == ModelType.TB:
                model = model_loader.get_tb_model()
            elif model_type == ModelType.PNEUMONIA:
                model = model_loader.get_pneumonia_model()
            else:
                raise ValueError(f"Invalid model type: {model_type}")

            # Run inference
            prediction = model.predict(processed_image, verbose=0)

            # Extract confidence and result
            confidence, result = self._interpret_prediction(prediction)

            # Calculate processing time
            processing_time = time.time() - start_time

            return {
                "result": result,
                "confidence": float(confidence),
                "processing_time": processing_time
            }

        except Exception as e:
            raise ValueError(f"Prediction failed: {str(e)}")

    def _interpret_prediction(
        self,
        prediction: np.ndarray
    ) -> Tuple[float, PredictionResult]:
        """
        Interpret model prediction output.

        Args:
            prediction: Model output (numpy array)

        Returns:
            Tuple of (confidence, result)
        """
        # Assuming binary classification with sigmoid output
        # prediction shape: (1, 1) or (1, 2) depending on model architecture

        if prediction.shape[-1] == 1:
            # Binary classification with single output (sigmoid)
            confidence = float(prediction[0][0])
            # If confidence > 0.5, it's positive, else normal
            if confidence > 0.5:
                result = PredictionResult.POSITIVE
            else:
                result = PredictionResult.NORMAL
                confidence = 1 - confidence  # Invert for normal confidence
        else:
            # Binary classification with two outputs (softmax)
            # Assuming index 0 = Normal, index 1 = Positive
            normal_confidence = float(prediction[0][0])
            positive_confidence = float(prediction[0][1])

            if positive_confidence > normal_confidence:
                result = PredictionResult.POSITIVE
                confidence = positive_confidence
            else:
                result = PredictionResult.NORMAL
                confidence = normal_confidence

        return confidence, result


# Global predictor instance
predictor = Predictor()
