import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np
import tensorflow as tf

from app.core.config import settings

logger = logging.getLogger(__name__)


class ModelLoader:
    """
    ML model loader and manager for Sehat-AI.

    Loads three models at startup:
        1. Chest X-ray Validator - gates all uploads, rejects non-X-rays
        2. TB Detection          - MobileNetV2, trained with CLAHE preprocessing
        3. Pneumonia Detection   - separate architecture, standard preprocessing

    Each model can have a companion metadata JSON with threshold and class mappings.
    """

    def __init__(self):
        self.tb_model: Optional[tf.keras.Model] = None
        self.pneumonia_model: Optional[tf.keras.Model] = None
        self.chest_xray_validator_model: Optional[tf.keras.Model] = None

        self._tb_config: Dict[str, Any] = {
            "best_threshold": settings.TB_DEFAULT_THRESHOLD,
            "class_indices": {"tb_negative": 0, "tb_positive": 1},
            "preprocessing": "CLAHE (clipLimit=2.0, tileGrid=8x8) + rescale 1/255",
            "base_model": "MobileNetV2",
        }

        self._pneumonia_config: Dict[str, Any] = {
            "best_threshold": settings.PNEUMONIA_DEFAULT_THRESHOLD,
            "class_indices": {"normal": 0, "pneumonia": 1},
            "preprocessing": "CLAHE (clipLimit=2.0, tileGrid=8x8) + EfficientNet preprocess_input",
            "base_model": "EfficientNetB3",
            "input_size": 300,
        }

        self._validator_config: Dict[str, Any] = {
            "best_threshold": settings.CHEST_XRAY_VALIDATOR_THRESHOLD,
            "class_indices": {"chest_xray": 0, "not_xray": 1},
        }

        self._models_loaded = False

    def load_models(self):
        """
        Load all models and their metadata at startup.

        TB and pneumonia models are required. Validator is optional.
        """
        try:
            logger.info("Loading Sehat-AI ML models...")

            # self._load_tb_model()
            # self._load_pneumonia_model()
            self._load_validator_model()
            # self._warmup_models()

            self._models_loaded = True
            logger.info(
                "All models loaded - "
                f"TB threshold={self._tb_config['best_threshold']}, "
                f"Pneumonia threshold={self._pneumonia_config['best_threshold']}, "
                f"Validator threshold={self._validator_config['best_threshold']}"
            )

        except Exception as e:
            logger.error(f"Model loading failed: {str(e)}")
            raise

    def _load_tb_model(self):
        model_path = Path(settings.TB_MODEL_PATH)
        if not model_path.exists():
            raise FileNotFoundError(
                f"TB model not found at {model_path}. "
                "Place tb_detection_model.h5 in the models/ directory."
            )

        self.tb_model = tf.keras.models.load_model(str(model_path))
        logger.info(f"TB model loaded - {model_path}")

        meta_path = Path(settings.TB_MODEL_METADATA_PATH)
        if meta_path.exists():
            self._tb_config = self._load_metadata(
                meta_path,
                self._tb_config,
                threshold_key="best_threshold",
                model_label="TB",
            )
        else:
            logger.warning(
                f"TB metadata not found at {meta_path}. "
                f"Using default threshold={self._tb_config['best_threshold']}."
            )

    def _load_pneumonia_model(self):
        model_path = Path(settings.PNEUMONIA_MODEL_PATH)
        if not model_path.exists():
            raise FileNotFoundError(
                f"Pneumonia model not found at {model_path}. "
                "Place pneumonia_detection_model.h5 in the models/ directory."
            )

        self.pneumonia_model = tf.keras.models.load_model(str(model_path))
        logger.info(f"Pneumonia model loaded - {model_path}")

        meta_path = Path(settings.PNEUMONIA_MODEL_METADATA_PATH)
        if meta_path.exists():
            self._pneumonia_config = self._load_metadata(
                meta_path,
                self._pneumonia_config,
                threshold_key="best_threshold",
                model_label="Pneumonia",
            )
        else:
            logger.warning(
                f"Pneumonia metadata not found at {meta_path}. "
                f"Using default threshold={self._pneumonia_config['best_threshold']}."
            )

    def _load_validator_model(self):
        model_path = Path(settings.CHEST_XRAY_VALIDATOR_MODEL_PATH)
        if not model_path.exists():
            logger.warning(
                f"Validator model not found at {model_path}. "
                "Chest X-ray validation will be skipped."
            )
            return

        self.chest_xray_validator_model = tf.keras.models.load_model(str(model_path))
        logger.info(f"Validator model loaded - {model_path}")

        meta_path = Path(settings.CHEST_XRAY_VALIDATOR_METADATA_PATH)
        if meta_path.exists():
            self._validator_config = self._load_metadata(
                meta_path,
                self._validator_config,
                threshold_key="best_threshold",
                model_label="Validator",
            )
        else:
            logger.warning(
                f"Validator metadata not found at {meta_path}. "
                f"Using default threshold={self._validator_config['best_threshold']}."
            )

    def _load_metadata(
        self,
        meta_path: Path,
        current_config: Dict[str, Any],
        threshold_key: str,
        model_label: str,
    ) -> Dict[str, Any]:
        """
        Load metadata JSON and merge into defaults.
        Null or missing values keep defaults.
        """
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)

            config = dict(current_config)

            raw_threshold = meta.get(threshold_key)
            if raw_threshold is not None:
                config["best_threshold"] = float(raw_threshold)

            raw_indices = meta.get("class_indices")
            if isinstance(raw_indices, dict) and raw_indices:
                config["class_indices"] = {
                    str(k): int(v) for k, v in raw_indices.items()
                }

            for field in [
                "base_model",
                "preprocessing",
                "dataset_balance",
                "val_accuracy",
                "val_auc",
                "val_recall",
                "val_precision",
            ]:
                if meta.get(field) is not None:
                    config[field] = meta[field]

            logger.info(
                f"{model_label} metadata loaded - "
                f"threshold={config['best_threshold']}, "
                f"class_indices={config['class_indices']}"
            )
            return config

        except Exception as e:
            logger.error(f"Failed to load {model_label} metadata from {meta_path}: {e}")
            return current_config

    def _warmup_models(self):
        """Run dummy inference through each loaded model."""
        logger.info("Running model warmup inference...")
        dummy_224 = np.random.rand(1, 224, 224, 3).astype(np.float32)
        dummy_300 = np.random.rand(1, 300, 300, 3).astype(np.float32)

        warmup_targets = [
            (self.tb_model, "TB", dummy_224),
            (self.pneumonia_model, "Pneumonia", dummy_300),
            (self.chest_xray_validator_model, "Validator", dummy_224),
        ]

        for model, label, dummy in warmup_targets:
            if model is not None:
                try:
                    model.predict(dummy, verbose=0)
                    logger.info(f"{label} model warmup complete")
                except Exception as e:
                    logger.warning(f"{label} model warmup failed: {e}")

    def get_tb_model(self) -> tf.keras.Model:
        if not self.tb_model:
            raise RuntimeError("TB model not loaded")
        return self.tb_model

    def get_tb_config(self) -> Dict[str, Any]:
        return dict(self._tb_config)

    def get_pneumonia_model(self) -> tf.keras.Model:
        if not self.pneumonia_model:
            raise RuntimeError("Pneumonia model not loaded")
        return self.pneumonia_model

    def get_pneumonia_config(self) -> Dict[str, Any]:
        return dict(self._pneumonia_config)

    def get_chest_xray_validator_model(self) -> tf.keras.Model:
        if not self.chest_xray_validator_model:
            raise RuntimeError("Validator model not loaded")
        return self.chest_xray_validator_model

    def get_chest_xray_validator_config(self) -> Dict[str, Any]:
        return dict(self._validator_config)

    @property
    def models_loaded(self) -> bool:
        return self._models_loaded


model_loader = ModelLoader()
