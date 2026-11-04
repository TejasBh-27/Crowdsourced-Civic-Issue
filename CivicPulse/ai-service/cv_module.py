"""
cv_module.py — Real Computer Vision using OpenCV + Pillow

Implements the actual image inspection pipeline:
1. Decode and validate the uploaded image
2. Compute Laplacian variance (standard blur detection algorithm)
3. Analyse brightness and contrast
4. Return a structured result the main pipeline uses to accept/reject
"""

import io
import cv2
import numpy as np
from PIL import Image, ImageStat


# Thresholds (tuned for typical 8-MP phone photos)
BLUR_THRESHOLD     = 80.0   # Laplacian variance below this = blurry
MIN_BRIGHTNESS     = 30     # 0-255; too dark = unusable
MAX_BRIGHTNESS     = 230    # too over-exposed = unusable
MIN_DIMENSION_PX   = 200    # reject tiny thumbnails
MIN_FILE_BYTES     = 8_000  # reject tiny/corrupt files


def inspect_image(image_bytes: bytes) -> dict:
    """
    Run computer-vision checks on raw image bytes.

    Returns a dict with:
        is_valid       : bool
        clarity_score  : int  0-100  (100 = perfectly sharp)
        confidence     : float 0-1
        rejection_reason: str | None
        details        : dict  (raw metrics for logging / frontend display)
    """

    # ── 0. Basic file-size guard ────────────────────────────────────────────
    if len(image_bytes) < MIN_FILE_BYTES:
        return _reject(
            f"Photo is too small ({len(image_bytes):,} bytes). "
            "Please upload a full-resolution image taken from 2–4 feet of the defect.",
            clarity_score=0,
            details={"file_bytes": len(image_bytes), "min_required": MIN_FILE_BYTES},
        )

    # ── 1. Decode with PIL ───────────────────────────────────────────────────
    try:
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        return _reject(f"Could not decode image: {exc}", clarity_score=0, details={})

    width, height = pil_img.size

    # ── 2. Dimension check ───────────────────────────────────────────────────
    if width < MIN_DIMENSION_PX or height < MIN_DIMENSION_PX:
        return _reject(
            f"Image too small ({width}×{height} px). Minimum is {MIN_DIMENSION_PX}×{MIN_DIMENSION_PX} px.",
            clarity_score=5,
            details={"width": width, "height": height},
        )

    # ── 3. Brightness check (PIL ImageStat) ─────────────────────────────────
    stat        = ImageStat.Stat(pil_img)
    brightness  = stat.mean[0]      # red-channel mean as brightness proxy
    contrast    = stat.stddev[0]    # std-dev as contrast proxy

    if brightness < MIN_BRIGHTNESS:
        return _reject(
            "Photo is too dark. Please take the photo in daylight or under good lighting.",
            clarity_score=10,
            details={"brightness": round(brightness, 1), "contrast": round(contrast, 1)},
        )
    if brightness > MAX_BRIGHTNESS:
        return _reject(
            "Photo is over-exposed. Avoid direct sunlight on the lens.",
            clarity_score=10,
            details={"brightness": round(brightness, 1), "contrast": round(contrast, 1)},
        )

    # ── 4. Laplacian-variance blur detection (core CV algorithm) ─────────────
    # Convert to grayscale numpy array for OpenCV
    np_img      = np.array(pil_img.convert("L"))   # uint8 grayscale
    laplacian   = cv2.Laplacian(np_img, cv2.CV_64F)
    lap_var     = laplacian.var()                   # high = sharp, low = blurry

    # Map Laplacian variance → 0-100 clarity score (log-scale)
    clarity_score = _lap_to_clarity(lap_var)

    if lap_var < BLUR_THRESHOLD:
        return _reject(
            f"Image appears blurry (sharpness score {clarity_score}/100). "
            "Hold the camera steady and retake the photo closer to the issue.",
            clarity_score=clarity_score,
            details={
                "laplacian_variance": round(lap_var, 2),
                "threshold": BLUR_THRESHOLD,
                "brightness": round(brightness, 1),
                "contrast": round(contrast, 1),
                "dimensions": f"{width}×{height}",
                "algorithm": "Laplacian Variance (OpenCV cv2.Laplacian)",
            },
        )

    # ── 5. Accept ────────────────────────────────────────────────────────────
    confidence = min(0.99, 0.60 + (lap_var / 600) * 0.35 + (contrast / 80) * 0.05)

    return {
        "is_valid":       True,
        "clarity_score":  clarity_score,
        "confidence":     round(confidence, 4),
        "rejection_reason": None,
        "details": {
            "laplacian_variance": round(lap_var, 2),
            "brightness":         round(brightness, 1),
            "contrast":           round(contrast, 1),
            "dimensions":         f"{width}×{height}",
            "file_bytes":         len(image_bytes),
            "algorithm":          "Laplacian Variance (OpenCV cv2.Laplacian)",
            "model":              "CivicCV-OpenCV v1.0",
        },
    }


# ── Helpers ──────────────────────────────────────────────────────────────────

def _lap_to_clarity(lap_var: float) -> int:
    """Map raw Laplacian variance to a 0-100 integer score."""
    # Empirical mapping: var<30→10, var≈80→50, var≈300→80, var≥600→100
    if lap_var <= 0:
        return 0
    import math
    score = min(100, int(15 * math.log1p(lap_var)))
    return max(0, score)


def _reject(reason: str, clarity_score: int, details: dict) -> dict:
    return {
        "is_valid":        False,
        "clarity_score":   clarity_score,
        "confidence":      round(max(0.0, clarity_score / 200), 4),
        "rejection_reason": reason,
        "details":         details,
    }
