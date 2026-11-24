"""Evaluation-time preprocessing, driven by the model's config.json.

Pipeline (proposal step 2): load image -> noise reduction -> contrast
adjustment (CLAHE) -> resize to the model's input size -> normalize with the
model config mean/std. The model input contract is unchanged: an RGB tensor
of config["input_size"] normalized with config mean/std.

Enhancement uses only Pillow + NumPy (no OpenCV dependency): a 3x3 median
filter for denoising and a NumPy CLAHE on the luminance (Y) channel so colour
balance is preserved. It is deterministic, and any enhancement failure falls
back to the un-enhanced image — enhancement must never crash inference.
Toggle with env PREPROCESS_ENHANCE=false (default: on).
"""
import numpy as np
from PIL import Image, ImageFilter
from torchvision import transforms
from torchvision.transforms import InterpolationMode

from ..config import settings

_INTERP = {
    "bilinear": InterpolationMode.BILINEAR,
    "bicubic": InterpolationMode.BICUBIC,
    "nearest": InterpolationMode.NEAREST,
}

_CLAHE_GRID = (8, 8)
_CLAHE_CLIP_LIMIT = 2.0


def _clahe(gray: np.ndarray, clip_limit: float = _CLAHE_CLIP_LIMIT, grid: tuple[int, int] = _CLAHE_GRID) -> np.ndarray:
    """Contrast-Limited Adaptive Histogram Equalization on a uint8 2-D array."""
    h, w = gray.shape
    rows, cols = grid
    tile_h = int(np.ceil(h / rows))
    tile_w = int(np.ceil(w / cols))
    pad_h = tile_h * rows - h
    pad_w = tile_w * cols - w
    padded = np.pad(gray, ((0, pad_h), (0, pad_w)), mode="reflect")

    clip_count = max(1, int(clip_limit * tile_h * tile_w / 256))
    luts = np.zeros((rows, cols, 256), dtype=np.float32)
    for i in range(rows):
        for j in range(cols):
            tile = padded[i * tile_h:(i + 1) * tile_h, j * tile_w:(j + 1) * tile_w]
            hist = np.bincount(tile.ravel(), minlength=256).astype(np.int64)
            excess = int(np.clip(hist - clip_count, 0, None).sum())
            hist = np.clip(hist, 0, clip_count)
            hist += excess // 256
            cdf = np.cumsum(hist).astype(np.float32)
            positive = cdf[cdf > 0]
            cdf_min = float(positive[0]) if positive.size else 0.0
            denom = max(1.0, float(cdf[-1]) - cdf_min)
            luts[i, j] = np.clip((cdf - cdf_min) / denom, 0.0, 1.0) * 255.0

    # Bilinear interpolation between the four nearest tile LUTs per pixel.
    ys = (np.arange(padded.shape[0], dtype=np.float32) + 0.5) / tile_h - 0.5
    xs = (np.arange(padded.shape[1], dtype=np.float32) + 0.5) / tile_w - 0.5
    y0 = np.floor(ys).astype(int)
    x0 = np.floor(xs).astype(int)
    fy = (ys - y0).astype(np.float32)
    fx = (xs - x0).astype(np.float32)
    y0c = np.clip(y0, 0, rows - 1)
    y1c = np.clip(y0 + 1, 0, rows - 1)
    x0c = np.clip(x0, 0, cols - 1)
    x1c = np.clip(x0 + 1, 0, cols - 1)
    vals = padded.astype(int)
    top_left = luts[y0c[:, None], x0c[None, :], vals]
    top_right = luts[y0c[:, None], x1c[None, :], vals]
    bot_left = luts[y1c[:, None], x0c[None, :], vals]
    bot_right = luts[y1c[:, None], x1c[None, :], vals]
    wy0 = (1.0 - fy)[:, None]
    wy1 = fy[:, None]
    wx0 = (1.0 - fx)[None, :]
    wx1 = fx[None, :]
    out = top_left * wy0 * wx0 + top_right * wy0 * wx1 + bot_left * wy1 * wx0 + bot_right * wy1 * wx1
    return np.clip(np.rint(out[:h, :w]), 0, 255).astype(np.uint8)


def enhance_image(image: Image.Image) -> Image.Image:
    """Denoise (median filter) + contrast enhancement (CLAHE on luminance)."""
    denoised = image.filter(ImageFilter.MedianFilter(size=3))
    ycbcr = denoised.convert("YCbCr")
    y, cb, cr = ycbcr.split()
    y_enhanced = Image.fromarray(_clahe(np.asarray(y, dtype=np.uint8)), mode="L")
    return Image.merge("YCbCr", (y_enhanced, cb, cr)).convert("RGB")


def preprocess_image(image: Image.Image, config: dict):
    """Preprocess one image for the model; returns (tensor, original_size_wh)."""
    size = config["input_size"]
    if len(size) != 2 or any(int(x) <= 0 for x in size):
        raise ValueError("input_size must contain [height, width]")
    if config.get("color_mode", "RGB") != "RGB":
        raise ValueError("Only RGB preprocessing is supported")
    original_size = [int(image.width), int(image.height)]
    rgb = image.convert("RGB")
    if settings.preprocess_enhance:
        try:
            rgb = enhance_image(rgb)
        except Exception:
            rgb = image.convert("RGB")  # fall back: enhancement never blocks inference
    pipeline = transforms.Compose([
        transforms.Resize((int(size[0]), int(size[1])), interpolation=_INTERP.get(config.get("resize_interpolation", "bilinear"), InterpolationMode.BILINEAR)),
        transforms.ToTensor(),
        transforms.Normalize(mean=config["mean"], std=config["std"]),
    ])
    return pipeline(rgb).unsqueeze(0), original_size
