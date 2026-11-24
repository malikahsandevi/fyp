"""Class-specific Grad-CAM. A model explanation, not verified clinical localisation."""
from io import BytesIO

import numpy as np
import torch
from PIL import Image

from .preprocessing import preprocess_image


def generate_gradcam_png(bundle: dict, image: Image.Image, label: str) -> bytes:
    labels = bundle["class_names"]
    if label not in labels:
        raise ValueError(f"Unknown class label {label!r}")
    layer_fn = bundle.get("gradcam_layer")
    if layer_fn is None:
        raise NotImplementedError("This model has no Grad-CAM target layer. Provide gradcam_layer in its adapter.")

    model = bundle["model"]
    target_layer = layer_fn(model)
    tensor, _ = preprocess_image(image, bundle["config"])
    tensor = tensor.to(bundle["device"])
    class_index = labels.index(label)

    captured = {}
    handle = target_layer.register_forward_hook(lambda _m, _i, out: captured.__setitem__("a", out))
    try:
        with torch.enable_grad():
            logits = model(tensor)
            if logits.ndim != 2 or logits.shape != (1, len(labels)):
                raise RuntimeError("Model output must have shape [1, num_classes]")
            acts = captured["a"]
            grads = torch.autograd.grad(logits[0, class_index], acts)[0]
            weights = grads.mean(dim=(2, 3), keepdim=True)
            heat = torch.relu((weights * acts).sum(dim=1))[0].detach().float().cpu()
    finally:
        handle.remove()

    heat = heat - heat.min()
    peak = float(heat.max())
    heat = heat / peak if peak > 1e-8 else torch.zeros_like(heat)

    mask = Image.fromarray((heat.numpy() * 255).round().astype(np.uint8), mode="L").resize(image.size, Image.Resampling.BILINEAR)
    m = np.asarray(mask, dtype=np.float32) / 255.0
    original = np.asarray(image.convert("RGB"), dtype=np.float32)
    opacity = (0.6 * m)[..., None]
    red = np.zeros_like(original)
    red[..., 0] = 255
    overlay = np.clip(original * (1 - opacity) + red * opacity, 0, 255).astype(np.uint8)
    out = BytesIO()
    Image.fromarray(overlay, mode="RGB").save(out, format="PNG")
    return out.getvalue()
