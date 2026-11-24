"""ModelService: loads models from the external registry and hot-swaps them.

Registry layout (outside the backend code):
    model_registry/
        active.json            {"active_model": "v1"}
        v1/config.json         architecture, input_size, mean/std, thresholds, ...
        v1/model.pth           {"model_state_dict": ..., "class_names": [...], "metadata": {...}}
        v1/adapter.py          (optional custom architecture, needs ALLOW_MODEL_PLUGINS)
"""
import json
import re
import threading
from pathlib import Path

import torch

from .adapters import resolve_adapter

_VERSION_RE = re.compile(r"^[A-Za-z0-9_-]+$")


def _read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


class ModelService:
    def __init__(self, registry_dir: Path, allow_plugins: bool = False, device: str | None = None):
        self.registry_dir = Path(registry_dir)
        self.allow_plugins = allow_plugins
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        # One lock guards inference, Grad-CAM (needs gradients on the shared model) and swaps.
        self.lock = threading.RLock()
        self.bundle: dict | None = None

    # ---- registry inspection -------------------------------------------------
    def list_versions(self) -> list[dict]:
        active = self.active_version()
        versions = []
        if not self.registry_dir.is_dir():
            return versions
        for d in sorted(p for p in self.registry_dir.iterdir() if p.is_dir() and _VERSION_RE.match(p.name)):
            cfg_path = d / "config.json"
            if not cfg_path.is_file():
                continue
            try:
                cfg = _read_json(cfg_path)
            except (OSError, ValueError):
                continue
            versions.append({
                "version": d.name,
                "architecture": cfg.get("architecture"),
                "description": cfg.get("description", ""),
                "active": d.name == active,
                "loaded": bool(self.bundle and self.bundle["version"] == d.name),
            })
        return versions

    def active_version(self) -> str | None:
        try:
            return _read_json(self.registry_dir / "active.json").get("active_model")
        except (OSError, ValueError):
            return None

    # ---- loading -------------------------------------------------------------
    def _build_bundle(self, version: str) -> dict:
        if not _VERSION_RE.match(version or ""):
            raise ValueError("Invalid model version name")
        model_dir = self.registry_dir / version
        if not model_dir.is_dir():
            raise FileNotFoundError(f"Model version '{version}' not found in registry")
        config = _read_json(model_dir / "config.json")
        ckpt_name = config["checkpoint"]
        if Path(ckpt_name).name != ckpt_name:
            raise ValueError("Checkpoint filename must not contain directories")
        checkpoint = torch.load(model_dir / ckpt_name, map_location="cpu", weights_only=True)
        class_names = checkpoint["class_names"]
        if not isinstance(class_names, list) or not class_names or not all(isinstance(x, str) and x for x in class_names):
            raise ValueError("Checkpoint must contain a non-empty class_names list")
        if len(set(class_names)) != len(class_names):
            raise ValueError("Duplicate class names in checkpoint")
        adapter = resolve_adapter(config["architecture"], model_dir, self.allow_plugins)
        model = adapter.build(len(class_names), config)
        model.load_state_dict(checkpoint["model_state_dict"], strict=True)
        model = model.to(self.device).eval()
        return {
            "version": version,
            "config": config,
            "class_names": class_names,
            "model": model,
            "device": self.device,
            "gradcam_layer": adapter.gradcam_layer,
            "metadata": checkpoint.get("metadata", {}) if isinstance(checkpoint.get("metadata", {}), dict) else {},
        }

    def load_active(self) -> dict:
        version = self.active_version()
        if not version:
            raise RuntimeError(f"No active model. Create {self.registry_dir / 'active.json'}")
        return self.load(version)

    def load(self, version: str) -> dict:
        new_bundle = self._build_bundle(version)  # build/validate first so a bad model never replaces a good one
        with self.lock:
            self.bundle = new_bundle
        return new_bundle

    def activate(self, version: str) -> dict:
        bundle = self.load(version)
        tmp = self.registry_dir / "active.json.tmp"
        tmp.write_text(json.dumps({"active_model": version}, indent=2), encoding="utf-8")
        tmp.replace(self.registry_dir / "active.json")
        return bundle

    def reload(self) -> dict:
        return self.load_active()

    def info(self) -> dict:
        b = self.bundle
        return {
            "model_version": b["version"],
            "architecture": b["config"]["architecture"],
            "num_classes": len(b["class_names"]),
            "class_names": b["class_names"],
            "input_size": b["config"]["input_size"],
            "threshold": b["config"].get("threshold", 0.5),
            "device": str(b["device"]),
            "gradcam_supported": b["gradcam_layer"] is not None,
            "metadata": b["metadata"],
        }
