import torch
from PIL import Image

from app.inference.adapters import resolve_adapter, supported_architectures
from app.inference.gradcam import generate_gradcam_png


def test_efficientnet_adapter_gradcam(tmp_path):
    adapter = resolve_adapter("efficientnet_b0", tmp_path, False)
    model = adapter.build(3, {}).eval()
    bundle = {"class_names": ["A", "B", "C"], "model": model, "device": torch.device("cpu"), "gradcam_layer": adapter.gradcam_layer,
              "config": {"input_size": [224, 224], "mean": [0.5] * 3, "std": [0.5] * 3}}
    png = generate_gradcam_png(bundle, Image.new("L", (300, 200), 100), "B")
    assert png[:4] == b"\x89PNG"
    assert "efficientnet_b0" in supported_architectures()


def test_plugin_requires_opt_in(tmp_path):
    (tmp_path / "adapter.py").write_text("import torch.nn as nn\ndef build_model(n, cfg):\n    return nn.Linear(2, n)\n")
    import pytest
    with pytest.raises(ValueError):
        resolve_adapter("anything", tmp_path, False)
    assert resolve_adapter("anything", tmp_path, True).build(4, {}).out_features == 4
