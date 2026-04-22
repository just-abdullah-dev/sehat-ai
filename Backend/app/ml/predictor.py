import time
import numpy as np
from typing import Any, Dict, Tuple
from app.ml.model_loader import model_loader
from app.ml.preprocessing import ImagePreprocessor
from app.models.scan import ModelType, PredictionResult


class Predictor:
    """Prediction engine for TB and Pneumonia detection"""

    def __init__(self):
        self.preprocessor = ImagePreprocessor(target_size=(224, 224))

    def validate_chest_xray(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Validate whether uploaded image is a chest X-ray using the validator model.

        Returns:
            Dict containing:
                - is_chest_xray: bool
                - score: float (raw sigmoid output)
                - threshold: float
        """
        validator_model = model_loader.get_chest_xray_validator_model()
        validator_config = model_loader.get_chest_xray_validator_config()

        # Derive validator input size from model shape to avoid hardcoding.
        input_shape = validator_model.input_shape
        target_size = (input_shape[2], input_shape[1])
        processed_image = self.preprocessor.preprocess_image(image_bytes, target_size=target_size)

        prediction = validator_model.predict(processed_image, verbose=0)
        score = float(prediction[0][0])

        threshold = float(validator_config["threshold"])
        class_indices = validator_config["class_indices"]
        not_xray_class_index = int(class_indices.get("not_xray", 1))

        # For sigmoid output, score corresponds to class index 1 probability.
        # Apply threshold on not_xray probability, then invert for chest-xray gate pass.
        if not_xray_class_index == 1:
            is_not_xray = score >= threshold
        else:
            is_not_xray = (1 - score) >= threshold

        is_chest_xray = not is_not_xray

        return {
            "is_chest_xray": is_chest_xray,
            "score": score,
            "threshold": threshold,
        }

    def predict(
        self,
        image_bytes: bytes,
        model_type: ModelType,
        validate_input: bool = True,
    ) -> Dict[str, Any]:
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
            if validate_input:
                validation = self.validate_chest_xray(image_bytes)
                if not validation["is_chest_xray"]:
                    raise ValueError(
                        "Uploaded image is not a valid chest X-ray. "
                        f"Validator score={validation['score']:.4f}, threshold={validation['threshold']:.4f}"
                    )

            # Get appropriate model first so we can read its expected input shape
            if model_type == ModelType.TB:
                model = model_loader.get_tb_model()
            elif model_type == ModelType.PNEUMONIA:
                model = model_loader.get_pneumonia_model()
            else:
                raise ValueError(f"Invalid model type: {model_type}")

            # Derive target size from model's own input spec: (None, H, W, C)
            input_shape = model.input_shape
            target_size = (input_shape[2], input_shape[1])  # PIL resize takes (width, height)

            # Preprocess image using the model's required resolution
            processed_image = self.preprocessor.preprocess_image(image_bytes, target_size=target_size)

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
