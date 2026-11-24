"""analyze(): prediction -> structured findings -> retrieval -> report."""
from PIL import Image

from .generation import DISCLAIMER_LINE
from .inference.predictor import predict

DISCLAIMER = "Research demonstration only; not a medical diagnosis. Scores are raw model outputs, not calibrated clinical probabilities."


def _query(label: str) -> str:
    return f"{label.replace('_', ' ')}"


def analyze(service, retriever, generator, settings, image: Image.Image) -> dict:
    with service.lock:  # bundle cannot be swapped mid-request
        result = predict(service.bundle, image)

    preds = result["predictions"]
    flagged = sorted((p for p in preds if p["flagged"]), key=lambda p: -p["score"])[: settings.max_findings]
    findings = []
    for p in flagged:
        contexts = retriever.search(_query(p["label"]), settings.retrieval_top_k, settings.retrieval_min_score, label=p["label"])
        findings.append({**p, "contexts": contexts, "grounded": bool(contexts)})

    report = generator.generate(findings)
    return {
        "schema_version": "1.0",
        **result,
        "predictions": sorted(preds, key=lambda p: -p["score"]),
        "findings": findings,
        "report": {**report, "banner": DISCLAIMER_LINE},
        "retrieval": {"min_score": settings.retrieval_min_score, "top_k": settings.retrieval_top_k, **retriever.stats()},
        "disclaimer": DISCLAIMER,
    }
