import tensorflow as tf
import numpy as np
import logging
from pathlib import Path
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class ModelLoader:
    """ML model loader and manager"""

    def __init__(self):
        self.tb_model: Optional[tf.keras.Model] = None
        self.pneumonia_model: Optional[tf.keras.Model] = None
        self._models_loaded = False

    def load_models(self):
        """
        Load TB and Pneumonia models at startup.
        Performs warm-up inference to reduce first prediction latency.
        """
        try:
            logger.info("Loading ML models...")

            # Load TB model
            tb_model_path = Path(settings.TB_MODEL_PATH)
            if tb_model_path.exists():
                self.tb_model = tf.keras.models.load_model(str(tb_model_path))
                logger.info(f"TB model loaded from {tb_model_path}")
            else:
                logger.warning(f"TB model not found at {tb_model_path}")

            # Load Pneumonia model
            pneumonia_model_path = Path(settings.PNEUMONIA_MODEL_PATH)
            if pneumonia_model_path.exists():
                self.pneumonia_model = tf.keras.models.load_model(str(pneumonia_model_path))
                logger.info(f"Pneumonia model loaded from {pneumonia_model_path}")
            else:
                logger.warning(f"Pneumonia model not found at {pneumonia_model_path}")

            # Perform warm-up inference
            self._warmup_models()

            self._models_loaded = True
            logger.info("All models loaded successfully")

        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise

    def _warmup_models(self):
        """
        Perform warm-up inference to reduce first prediction latency.
        """
        try:
            logger.info("Performing warm-up inference...")

            # Create dummy input (320x320x3 RGB image)
            dummy_input = np.random.rand(1, 320, 320, 3).astype(np.float32)

            if self.tb_model:
                _ = self.tb_model.predict(dummy_input, verbose=0)
                logger.info("TB model warm-up completed")

            if self.pneumonia_model:
                _ = self.pneumonia_model.predict(dummy_input, verbose=0)
                logger.info("Pneumonia model warm-up completed")

        except Exception as e:
            logger.warning(f"Error during warm-up: {str(e)}")

    def get_tb_model(self) -> tf.keras.Model:
        """
        Get TB detection model.

        Returns:
            TB model instance

        Raises:
            RuntimeError: If model is not loaded
        """
        if not self.tb_model:
            raise RuntimeError("TB model not loaded")
        return self.tb_model

    def get_pneumonia_model(self) -> tf.keras.Model:
        """
        Get Pneumonia detection model.

        Returns:
            Pneumonia model instance

        Raises:
            RuntimeError: If model is not loaded
        """
        if not self.pneumonia_model:
            raise RuntimeError("Pneumonia model not loaded")
        return self.pneumonia_model

    @property
    def models_loaded(self) -> bool:
        """Check if models are loaded"""
        return self._models_loaded


# Global model loader instance
model_loader = ModelLoader()
