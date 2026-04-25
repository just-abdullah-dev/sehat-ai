import time
from typing import Any, Dict, Optional, Tuple

from app.ml.gradcam import PneumoniaGradCAM
from app.ml.model_loader import model_loader
from app.ml.preprocessing import ImagePreprocessor
from app.models.scan import ModelType, PredictionResult


class Predictor:
    """
    Prediction engine for Sehat-AI disease detection.

    Inference pipeline per request:
        1. Optional chest X-ray validation
        2. Model-specific preprocessing route
        3. Inference
        4. Metadata-threshold decision
    """

    def __init__(self):
        self.preprocessor = ImagePreprocessor(target_size=(224, 224))

    def validate_chest_xray(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Validate whether uploaded image is a chest X-ray using validator model.
        """
        validator_model = model_loader.get_chest_xray_validator_model()
        validator_config = model_loader.get_chest_xray_validator_config()

        input_shape = validator_model.input_shape
        target_size = (input_shape[2], input_shape[1])

        processed = self.preprocessor.preprocess_for_validator(
            image_bytes,
            target_size=target_size,
        )

        prediction = validator_model.predict(processed, verbose=0)
        score = float(prediction[0][0])

        threshold = float(validator_config["best_threshold"])
        class_indices = validator_config["class_indices"]
        not_xray_index = int(class_indices.get("not_xray", 1))

        if not_xray_index == 1:
            is_not_xray = score >= threshold
        else:
            is_not_xray = (1.0 - score) >= threshold

        return {
            "is_chest_xray": not is_not_xray,
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
        Run disease prediction for TB or pneumonia.
        """
        start_time = time.time()

        try:
            if validate_input:
                validation = self.validate_chest_xray(image_bytes)
                if not validation["is_chest_xray"]:
                    raise ValueError(
                        "Not a chest X-ray. "
                        f"validator_score={validation['score']:.4f}, "
                        f"threshold={validation['threshold']:.4f}"
                    )

            if model_type == ModelType.TB:
                result, confidence = self._run_tb(image_bytes)
            elif model_type == ModelType.PNEUMONIA:
                result, confidence = self._run_pneumonia(image_bytes)
            else:
                raise ValueError(f"Unknown model type: {model_type}")

            return {
                "result": result,
                "confidence": float(confidence),
                "processing_time": time.time() - start_time,
            }

        except Exception as e:
            raise ValueError(f"Prediction failed: {str(e)}")

    def _run_tb(self, image_bytes: bytes) -> Tuple[PredictionResult, float]:
        """Run TB inference with CLAHE preprocessing and metadata threshold."""
        model = model_loader.get_tb_model()
        config = model_loader.get_tb_config()

        input_shape = model.input_shape
        target_size = (input_shape[2], input_shape[1])

        processed = self.preprocessor.preprocess_for_tb(
            image_bytes,
            target_size=target_size,
        )

        prediction = model.predict(processed, verbose=0)
        raw_score = float(prediction[0][0])

        threshold = float(config["best_threshold"])
        class_indices = config["class_indices"]
        positive_index = int(class_indices.get("tb_positive", 1))

        return self._apply_threshold(raw_score, threshold, positive_index)

    def _run_pneumonia(self, image_bytes: bytes) -> Tuple[PredictionResult, float]:
        """Run pneumonia inference with standard preprocessing and metadata threshold."""
        model = model_loader.get_pneumonia_model()
        config = model_loader.get_pneumonia_config()

        input_shape = model.input_shape
        target_size = (input_shape[2], input_shape[1])

        processed = self.preprocessor.preprocess_for_pneumonia(
            image_bytes,
            target_size=target_size,
        )

        prediction = model.predict(processed, verbose=0)
        raw_score = float(prediction[0][0])

        threshold = float(config["best_threshold"])
        class_indices = config["class_indices"]
        positive_index = int(
            class_indices.get(
                "pneumonia",
                class_indices.get("positive", class_indices.get("tb_positive", 1)),
            )
        )

        return self._apply_threshold(raw_score, threshold, positive_index)

    def _apply_threshold(
        self,
        raw_score: float,
        threshold: float,
        positive_class_index: int,
    ) -> Tuple[PredictionResult, float]:
        """
        Convert sigmoid output into PredictionResult using model-specific threshold.
        """
        if positive_class_index == 1:
            is_positive = raw_score >= threshold
            confidence = raw_score if is_positive else (1.0 - raw_score)
        else:
            is_positive = (1.0 - raw_score) >= threshold
            confidence = (1.0 - raw_score) if is_positive else raw_score

        result = PredictionResult.POSITIVE if is_positive else PredictionResult.NORMAL
        return result, float(confidence)

    def predict_pneumonia_with_gradcam(
        self,
        image_bytes: bytes,
        save_dir: Optional[str] = None,
        mode: str = "both",
    ) -> Dict[str, Any]:
        """
        Run pneumonia inference and generate full Grad-CAM report.

        Args:
            image_bytes: Raw image bytes from upload
            save_dir: Directory to save PNG files (for URL mode)
            mode: "base64" | "url" | "both"

        Returns standard prediction fields plus 'gradcam' report dict.
        """
        start_time = time.time()

        model = model_loader.get_pneumonia_model()
        config = model_loader.get_pneumonia_config()
        input_shape = model.input_shape
        target_size = (input_shape[2], input_shape[1])

        processed = self.preprocessor.preprocess_for_pneumonia(
            image_bytes,
            target_size=target_size,
        )

        prediction = model.predict(processed, verbose=0)
        raw_score = float(prediction[0][0])
        threshold = float(config["best_threshold"])
        class_indices = config["class_indices"]
        positive_index = int(
            class_indices.get(
                "pneumonia",
                class_indices.get("positive", 1),
            )
        )
        result, confidence = self._apply_threshold(raw_score, threshold, positive_index)

        gradcam_engine = PneumoniaGradCAM(model)
        gradcam_report = gradcam_engine.generate(
            image_bytes=image_bytes,
            preprocessed_input=processed,
            save_dir=save_dir,
            mode=mode,
        )

        return {
            "result": result,
            "confidence": float(confidence),
            "processing_time": time.time() - start_time,
            "threshold": threshold,
            "gradcam": gradcam_report,
        }


predictor = Predictor()
