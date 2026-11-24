import shutil
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))


@pytest.fixture()
def registry(tmp_path, monkeypatch):
    """Copy the real registry so activation tests never touch the original."""
    dst = tmp_path / "model_registry"
    shutil.copytree(ROOT / "model_registry", dst)
    monkeypatch.setenv("MODEL_REGISTRY_DIR", str(dst))
    from app.config import settings
    monkeypatch.setattr(settings, "model_registry_dir", dst)
    return dst


@pytest.fixture()
def client(registry):
    from app.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def xray():
    return (Path(__file__).parent / "sample_xray.png").read_bytes()
