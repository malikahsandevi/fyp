import torch
from PIL import Image

from .preprocessing import preprocess_image


def predict(bundle: dict, image: Image.Image, threshold_override: float | None = None) -> dict:
    config = bundle["config"]
    tensor, original_size = preprocess_image(image, config)
    with torch.inference_mode():
        logits = bundle["model"](tensor.to(bundle["device"]))
        scores = torch.sigmoid(logits).float().cpu().flatten().tolist()

    labels = bundle["class_names"]
    if len(scores) != len(labels):
        raise RuntimeError("Model output length does not match class_names")
    default_threshold = float(config.get("threshold", 0.5))
    per_class = config.get("class_thresholds", {})
    results = []
    for label, score in zip(labels, scores):
        threshold = float(threshold_override if threshold_override is not None else per_class.get(label, default_threshold))
        results.append({"label": label, "score": round(score, 6), "threshold": threshold, "flagged": score >= threshold})
    return {
        "model_version": bundle["version"],
        "architecture": config["architecture"],
        "input": {"original_size_wh": original_size, "processed_size_hw": config["input_size"]},
        "predictions": results,
    }
