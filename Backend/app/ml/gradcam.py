"""
Grad-CAM engine for Pneumonia EfficientNetB3 model.

Computes gradient-weighted class activation maps and performs
lung zone analysis on the resulting heatmap.
"""

import base64
import io
import logging
import os
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import tensorflow as tf
from PIL import Image

logger = logging.getLogger(__name__)


# Fractions of heatmap (row_start, row_end, col_start, col_end) in [0.0, 1.0]
LUNG_ZONES: Dict[str, Tuple[float, float, float, float]] = {
    "Upper Left": (0.00, 0.40, 0.00, 0.50),
    "Upper Right": (0.00, 0.40, 0.50, 1.00),
    "Lower Left": (0.40, 0.80, 0.00, 0.50),
    "Lower Right": (0.40, 0.80, 0.50, 1.00),
    "Central/Hilar": (0.25, 0.65, 0.30, 0.70),
}

ZONE_LOW = 0.30
ZONE_MEDIUM = 0.55
ZONE_HIGH = 0.75


def _to_base64_png(img_array: np.ndarray) -> str:
    """Convert uint8 numpy (H, W, 3) array to base64 PNG string."""
    if img_array.dtype != np.uint8:
        img_array = np.clip(img_array, 0, 255).astype(np.uint8)
    buffer = io.BytesIO()
    Image.fromarray(img_array).save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def _save_png(img_array: np.ndarray, save_path: str) -> None:
    """Save uint8 numpy array as PNG file."""
    if img_array.dtype != np.uint8:
        img_array = np.clip(img_array, 0, 255).astype(np.uint8)
    Image.fromarray(img_array).save(save_path, format="PNG")


def apply_clahe_rgb(img_rgb_uint8: np.ndarray) -> np.ndarray:
    """
    Apply CLAHE on the L-channel of LAB colorspace.
    Input/output: RGB uint8 (H, W, 3).
    """
    lab = cv2.cvtColor(img_rgb_uint8, cv2.COLOR_RGB2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab_enhanced = cv2.merge([clahe.apply(l_ch), a_ch, b_ch])
    return cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2RGB)


def find_last_conv_layer(model: tf.keras.Model) -> str:
    """
    Auto-detect the last conv layer inside the efficientnetb3 sub-layer.
    Falls back to 'top_conv'.
    """
    try:
        efficientnet = model.get_layer("efficientnetb3")
        for layer in reversed(efficientnet.layers):
            if "conv" in layer.name.lower():
                logger.info("Grad-CAM: auto-detected last conv layer -> %s", layer.name)
                return layer.name
    except Exception as e:
        logger.warning("Could not auto-detect last conv layer: %s", e)
    return "top_conv"


def compute_gradcam_heatmap(
    model: tf.keras.Model,
    preprocessed_input: np.ndarray,
    last_conv_layer_name: str = "top_conv",
    pred_index: int = 0,
) -> np.ndarray:
    """
    Compute Grad-CAM heatmap using a sub-model from inside efficientnetb3.

    Returns:
        heatmap: float32 numpy array (H, W) in [0, 1]
    """
    try:
        efficientnet = model.get_layer("efficientnetb3")
    except ValueError as exc:
        raise RuntimeError(
            "Could not find 'efficientnetb3' layer in model. "
            "Ensure the model was built with EfficientNetB3 as a named sub-layer."
        ) from exc

    conv_model = tf.keras.Model(
        inputs=efficientnet.input,
        outputs=efficientnet.get_layer(last_conv_layer_name).output,
    )

    with tf.GradientTape() as tape:
        conv_outputs = conv_model(preprocessed_input, training=False)
        tape.watch(conv_outputs)
        predictions = model(preprocessed_input, training=False)
        loss = predictions[:, pred_index]

    grads = tape.gradient(loss, conv_outputs)

    if grads is None:
        logger.warning("Grad-CAM: gradients are None - using mean activation fallback")
        heatmap = tf.reduce_mean(conv_outputs[0], axis=-1).numpy()
    else:
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_out = conv_outputs[0]
        heatmap = (conv_out @ pooled_grads[..., tf.newaxis])
        heatmap = tf.squeeze(heatmap)

    heatmap = _normalize_heatmap(heatmap)
    if heatmap.size:
        heatmap = cv2.GaussianBlur(heatmap, (5, 5), 0)
        heatmap = _normalize_heatmap(heatmap)

    logger.info(
        "GradCAM heatmap stats: min=%s, max=%s",
        float(heatmap.min()) if heatmap.size else 0.0,
        float(heatmap.max()) if heatmap.size else 0.0,
    )

    return heatmap


def heatmap_to_colormap(heatmap: np.ndarray, target_size: Tuple[int, int]) -> np.ndarray:
    """
    Resize heatmap and apply JET colormap.

    target_size is (width, height).
    """
    resized = cv2.resize(heatmap, target_size)
    colormap_bgr = cv2.applyColorMap(np.uint8(255 * resized), cv2.COLORMAP_JET)
    return cv2.cvtColor(colormap_bgr, cv2.COLOR_BGR2RGB)


def create_overlay(
    original_rgb: np.ndarray,
    colormap_rgb: np.ndarray,
    alpha: float = 0.45,
) -> np.ndarray:
    """Blend Grad-CAM colormap onto original X-ray image."""
    return cv2.addWeighted(
        original_rgb.astype(np.uint8),
        1 - alpha,
        colormap_rgb.astype(np.uint8),
        alpha,
        0,
    )


def _normalize_heatmap(heatmap: np.ndarray) -> np.ndarray:
    """Normalize a heatmap safely to [0, 1]."""
    heatmap = np.asarray(heatmap, dtype=np.float32)
    heatmap = tf.nn.relu(heatmap).numpy()

    if heatmap.size and float(heatmap.max()) > 0:
        heatmap = heatmap / (float(heatmap.max()) + 1e-8)

    return np.clip(heatmap, 0.0, 1.0).astype(np.float32)


def analyze_lung_zones(heatmap: np.ndarray) -> List[Dict]:
    """
    Measure mean Grad-CAM activation intensity in each predefined lung zone.
    """
    heatmap = _normalize_heatmap(heatmap)
    h, w = heatmap.shape
    zones = []

    for zone_name, (r0, r1, c0, c1) in LUNG_ZONES.items():
        region = heatmap[int(r0 * h):int(r1 * h), int(c0 * w):int(c1 * w)]
        mean_val = float(np.mean(region))

        if mean_val >= ZONE_HIGH:
            severity = "High"
        elif mean_val >= ZONE_MEDIUM:
            severity = "Medium"
        elif mean_val >= ZONE_LOW:
            severity = "Low"
        else:
            severity = "Minimal"

        zones.append({
            "zone": zone_name,
            "mean_activation": round(mean_val, 4),
            "severity": severity,
            "affected": mean_val >= ZONE_LOW,
        })

    return sorted(zones, key=lambda z: z["mean_activation"], reverse=True)


class PneumoniaGradCAM:
    """Full Grad-CAM report generator for the Pneumonia EfficientNetB3 model."""

    def __init__(self, model: tf.keras.Model):
        self.model = model
        self.last_conv_layer = find_last_conv_layer(model)

    def generate(
        self,
        image_bytes: bytes,
        preprocessed_input: np.ndarray,
        save_dir: Optional[str] = None,
        mode: str = "both",
    ) -> Dict:
        """
        Run full Grad-CAM pipeline and return report dict.
        """
        include_b64 = mode in ("base64", "both")
        include_url = mode in ("url", "both") and save_dir is not None

        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((300, 300))
        original_rgb = np.array(pil_img)
        clahe_rgb = apply_clahe_rgb(original_rgb)

        heatmap = compute_gradcam_heatmap(
            model=self.model,
            preprocessed_input=preprocessed_input,
            last_conv_layer_name=self.last_conv_layer,
        )
        colormap_rgb = heatmap_to_colormap(heatmap, target_size=(300, 300))
        overlay_rgb = create_overlay(original_rgb, colormap_rgb, alpha=0.45)

        zones = analyze_lung_zones(heatmap)
        affected_zones = [z["zone"] for z in zones if z["affected"]]
        primary_zone = affected_zones[0] if affected_zones else "None"
        overall_activation = float(np.mean([z["mean_activation"] for z in zones])) if zones else 0.0

        result = {
            "original_b64": _to_base64_png(original_rgb) if include_b64 else None,
            "clahe_b64": _to_base64_png(clahe_rgb) if include_b64 else None,
            "heatmap_b64": _to_base64_png(colormap_rgb) if include_b64 else None,
            "overlay_b64": _to_base64_png(overlay_rgb) if include_b64 else None,
            "lung_zones": zones,
            "affected_zones": affected_zones,
            "primary_affected_zone": primary_zone,
            "overall_activation": overall_activation,
            "last_conv_layer": self.last_conv_layer,
            "original_url": None,
            "clahe_url": None,
            "heatmap_url": None,
            "overlay_url": None,
        }

        if include_url and save_dir is not None:
            os.makedirs(save_dir, exist_ok=True)
            file_map = {
                "original.png": (original_rgb, "original_url"),
                "clahe.png": (clahe_rgb, "clahe_url"),
                "heatmap.png": (colormap_rgb, "heatmap_url"),
                "overlay.png": (overlay_rgb, "overlay_url"),
            }
            for filename, (arr, url_key) in file_map.items():
                full_path = os.path.join(save_dir, filename)
                _save_png(arr, full_path)
                result[url_key] = "/" + full_path.replace("\\", "/").lstrip("/")

        return result
