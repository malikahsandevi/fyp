"""Architecture adapters: the only place that knows about concrete networks.

An adapter = (build function, Grad-CAM target-layer function).
To support a new architecture either:
  1. register it here with `register_architecture(...)`, or
  2. drop an `adapter.py` into the model's registry folder (needs ALLOW_MODEL_PLUGINS=true)
     exposing `build_model(num_classes, config)` and optionally `gradcam_layer(model)`.
Nothing else in the backend or frontend changes.
"""
import importlib.util
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import torch.nn as nn
from torchvision.models import densenet121, efficientnet_b0


@dataclass
class Adapter:
    build: Callable[[int, dict], nn.Module]
    gradcam_layer: Callable[[nn.Module], nn.Module] | None = None


_ARCHITECTURES: dict[str, Adapter] = {}


def register_architecture(name: str, build, gradcam_layer=None) -> None:
    _ARCHITECTURES[name] = Adapter(build=build, gradcam_layer=gradcam_layer)


def supported_architectures() -> list[str]:
    return sorted(_ARCHITECTURES)


class MedVisionDenseNet(nn.Module):
    """Key names match the original training densenet.py (`model.*`)."""

    def __init__(self, num_classes: int):
        super().__init__()
        self.model = densenet121(weights=None)
        self.model.classifier = nn.Linear(self.model.classifier.in_features, num_classes)

    def forward(self, images):
        return self.model(images)


class MedVisionEfficientNetB0(nn.Module):
    def __init__(self, num_classes: int):
        super().__init__()
        self.model = efficientnet_b0(weights=None)
        self.model.classifier[1] = nn.Linear(self.model.classifier[1].in_features, num_classes)

    def forward(self, images):
        return self.model(images)


register_architecture("densenet121", lambda n, cfg: MedVisionDenseNet(n), lambda m: m.model.features.norm5)
register_architecture("efficientnet_b0", lambda n, cfg: MedVisionEfficientNetB0(n), lambda m: m.model.features)


def _load_plugin(model_dir: Path) -> Adapter:
    path = model_dir / "adapter.py"
    spec = importlib.util.spec_from_file_location(f"medvision_plugin_{model_dir.name}", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if not hasattr(module, "build_model"):
        raise ValueError(f"{path} must define build_model(num_classes, config)")
    return Adapter(build=module.build_model, gradcam_layer=getattr(module, "gradcam_layer", None))


def resolve_adapter(architecture: str, model_dir: Path, allow_plugins: bool) -> Adapter:
    if (model_dir / "adapter.py").is_file():
        if not allow_plugins:
            raise ValueError(f"{model_dir.name} ships adapter.py but ALLOW_MODEL_PLUGINS is not enabled")
        return _load_plugin(model_dir)
    if architecture not in _ARCHITECTURES:
        raise ValueError(f"Unsupported architecture '{architecture}'. Supported: {supported_architectures()}. Register an adapter or ship adapter.py in the model folder.")
    return _ARCHITECTURES[architecture]
