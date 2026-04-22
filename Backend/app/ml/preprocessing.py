import numpy as np
from PIL import Image
from typing import Tuple
import io


class ImagePreprocessor:
    """Image preprocessing utilities for ML models"""

    def __init__(self, target_size: Tuple[int, int] = (224, 224)):
        """
        Initialize preprocessor.

        Args:
            target_size: Target image size (width, height)
        """
        self.target_size = target_size

    def preprocess_image(self, image_bytes: bytes, target_size: Tuple[int, int] = None) -> np.ndarray:
        """
        Preprocess uploaded image for model inference.

        Args:
            image_bytes: Raw image bytes
            target_size: Override (width, height); uses self.target_size if None

        Returns:
            Preprocessed image array ready for model input

        Raises:
            ValueError: If image cannot be processed
        """
        size = target_size if target_size is not None else self.target_size
        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_bytes))

            # Convert to RGB if necessary
            if image.mode != "RGB":
                image = image.convert("RGB")

            # Resize to target size
            image = image.resize(size)

            # Convert to numpy array
            img_array = np.array(image)

            # Normalize pixel values to [0, 1]
            img_array = img_array.astype(np.float32) / 255.0

            # Add batch dimension
            img_array = np.expand_dims(img_array, axis=0)

            return img_array

        except Exception as e:
            raise ValueError(f"Error preprocessing image: {str(e)}")

    def preprocess_grayscale(self, image_bytes: bytes) -> np.ndarray:
        """
        Preprocess image to grayscale for models that require single-channel input.

        Args:
            image_bytes: Raw image bytes

        Returns:
            Preprocessed grayscale image array

        Raises:
            ValueError: If image cannot be processed
        """
        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_bytes))

            # Convert to grayscale
            image = image.convert("L")

            # Resize to target size
            image = image.resize(self.target_size)

            # Convert to numpy array
            img_array = np.array(image)

            # Normalize pixel values to [0, 1]
            img_array = img_array.astype(np.float32) / 255.0

            # Add channel dimension and batch dimension
            img_array = np.expand_dims(img_array, axis=-1)
            img_array = np.expand_dims(img_array, axis=0)

            return img_array

        except Exception as e:
            raise ValueError(f"Error preprocessing grayscale image: {str(e)}")
