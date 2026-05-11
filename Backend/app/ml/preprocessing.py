import io
from typing import Tuple

import cv2
import numpy as np
from PIL import Image, ImageOps


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
        Preprocess image for pneumonia model from
        open-src-model/chest-xray-pneumonia-detection.

        Pipeline parity with source app:
            1. Load via PIL and convert to RGB
            2. Resize to 180x180 (Lanczos)
            3. Keep pixel range as-is (no CLAHE, no scaling)
            4. Add batch dimension
        """
        size = target_size if target_size is not None else (180, 180)
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            fitted = ImageOps.fit(image, size, method=Image.Resampling.LANCZOS)
            img_np = np.asarray(fitted).astype(np.uint8)
            rgb = cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB)
            return np.expand_dims(rgb.astype(np.float32), axis=0)

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
