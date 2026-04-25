import io
from typing import Tuple

import cv2
import numpy as np
from PIL import Image


class ImagePreprocessor:
    """
    Image preprocessing for Sehat-AI ML models.

    IMPORTANT: Each model was trained with a specific preprocessing pipeline.
    Mixing pipelines (e.g. applying CLAHE to the pneumonia model) will degrade
    inference accuracy. Always use the method that matches the model.

    Method -> Model mapping:
        preprocess_for_tb()         -> TB detection model only
        preprocess_for_pneumonia()  -> Pneumonia detection model only
        preprocess_for_validator()  -> Chest X-ray validator model only
    """

    def __init__(self, target_size: Tuple[int, int] = (224, 224)):
        self.target_size = target_size

    def preprocess_for_tb(
        self,
        image_bytes: bytes,
        target_size: Tuple[int, int] = None,
    ) -> np.ndarray:
        """
        Preprocess image for TB detection model.

        Pipeline:
            1. Load via PIL (handles jpg, png, webp)
            2. Convert to RGB
            3. Resize
            4. Apply CLAHE on LAB L-channel
            5. Normalize to [0, 1]
            6. Add batch dimension
        """
        size = target_size if target_size is not None else self.target_size
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            image = image.resize(size)
            img_np = np.array(image).astype(np.uint8)

            lab = cv2.cvtColor(img_np, cv2.COLOR_RGB2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab)

            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l_enhanced = clahe.apply(l_channel)

            lab_enhanced = cv2.merge([l_enhanced, a_channel, b_channel])
            img_enhanced = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2RGB)

            img_array = img_enhanced.astype(np.float32) / 255.0
            return np.expand_dims(img_array, axis=0)

        except Exception as e:
            raise ValueError(f"TB preprocessing failed: {str(e)}")

    def preprocess_for_pneumonia(
        self,
        image_bytes: bytes,
        target_size: Tuple[int, int] = None,
    ) -> np.ndarray:
        """
        Preprocess image for Pneumonia detection model (EfficientNetB3, .keras).

        Pipeline:
            1. Load via PIL, convert to RGB
            2. Resize to 300×300 (EfficientNetB3 native input size)
            3. Apply CLAHE on LAB L-channel (clipLimit=2.0, tileGrid=8×8)
               — enhances consolidations, infiltrates, air bronchograms
            4. Pass through EfficientNet preprocess_input (ImageNet mean/std normalization)
               — expects [0,255] float32 range, NOT [0,1]
            5. Add batch dimension → shape (1, 300, 300, 3)

        NOTE: target_size is accepted for interface compatibility but EfficientNetB3
        always uses 300×300. If the model's input_shape differs, the caller's
        target_size from model.input_shape will override correctly.
        """
        import tensorflow as tf

        size = target_size if target_size is not None else (300, 300)
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            image = image.resize(size)
            img_np = np.array(image).astype(np.uint8)

            # CLAHE on LAB L-channel
            lab = cv2.cvtColor(img_np, cv2.COLOR_RGB2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l_enhanced = clahe.apply(l_channel)
            lab_enhanced = cv2.merge([l_enhanced, a_channel, b_channel])
            img_enhanced = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2RGB)

            # EfficientNet normalization — preprocess_input expects [0, 255] float32
            img_float = img_enhanced.astype(np.float32)
            img_preprocessed = tf.keras.applications.efficientnet.preprocess_input(img_float)

            return np.expand_dims(img_preprocessed, axis=0)

        except Exception as e:
            raise ValueError(f"Pneumonia preprocessing failed: {str(e)}")

    def preprocess_for_validator(
        self,
        image_bytes: bytes,
        target_size: Tuple[int, int] = None,
    ) -> np.ndarray:
        """
        Preprocess image for chest X-ray validator model.

        Identical pipeline to pneumonia preprocessing.
        """
        size = target_size if target_size is not None else self.target_size
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            image = image.resize(size)
            img_array = np.array(image).astype(np.float32) / 255.0
            return np.expand_dims(img_array, axis=0)

        except Exception as e:
            raise ValueError(f"Validator preprocessing failed: {str(e)}")

    def preprocess_image(
        self,
        image_bytes: bytes,
        target_size: Tuple[int, int] = None,
    ) -> np.ndarray:
        """Generic preprocessing without CLAHE for backward compatibility."""
        return self.preprocess_for_validator(image_bytes, target_size)

    def preprocess_grayscale(self, image_bytes: bytes) -> np.ndarray:
        """Grayscale preprocessing for single-channel models."""
        try:
            image = Image.open(io.BytesIO(image_bytes))
            image = image.convert("L")
            image = image.resize(self.target_size)
            img_array = np.array(image).astype(np.float32) / 255.0
            img_array = np.expand_dims(img_array, axis=-1)
            return np.expand_dims(img_array, axis=0)
        except Exception as e:
            raise ValueError(f"Grayscale preprocessing failed: {str(e)}")
