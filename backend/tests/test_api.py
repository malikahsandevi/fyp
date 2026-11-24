import json
import shutil


def test_health_and_model(client):
    assert client.get("/health").json()["status"] == "ok"
    info = client.get("/api/v1/model").json()
    assert info["architecture"] == "densenet121" and info["num_classes"] == len(info["class_names"]) > 0


def test_analyze_pipeline(client, xray):
    r = client.post("/api/v1/analyze", files={"file": ("x.png", xray, "image/png")})
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["predictions"]) == client.get("/api/v1/model").json()["num_classes"]
    assert all(0 <= p["score"] <= 1 for p in body["predictions"])
    assert body["report"]["banner"] and body["disclaimer"]
    for f in body["findings"]:
        assert f["grounded"] == bool(f["contexts"])
        assert all(c["score"] >= body["retrieval"]["min_score"] for c in f["contexts"])


def test_gradcam_png(client, xray):
    label = client.get("/api/v1/model").json()["class_names"][0]
    r = client.post(f"/api/v1/gradcam?label={label}", files={"file": ("x.png", xray, "image/png")})
    assert r.status_code == 200 and r.content[:8] == b"\x89PNG\r\n\x1a\n"
    assert client.post("/api/v1/gradcam?label=Nope", files={"file": ("x.png", xray, "image/png")}).status_code == 400


def test_rejects_bad_upload(client):
    assert client.post("/api/v1/analyze", files={"file": ("x.txt", b"hello", "text/plain")}).status_code == 400
    assert client.post("/api/v1/analyze", files={"file": ("x.png", b"", "image/png")}).status_code == 400


def test_hot_swap_new_version_without_code_change(client, registry, xray):
    shutil.copytree(registry / "v1", registry / "v2")
    cfg = json.loads((registry / "v2" / "config.json").read_text())
    cfg["description"] = "copy for swap test"
    (registry / "v2" / "config.json").write_text(json.dumps(cfg))
    assert {v["version"] for v in client.get("/api/v1/models").json()["versions"]} == {"v1", "v2"}
    assert client.post("/api/v1/models/activate", json={"version": "v2"}).json()["model_version"] == "v2"
    assert json.loads((registry / "active.json").read_text())["active_model"] == "v2"
    r = client.post("/api/v1/analyze", files={"file": ("x.png", xray, "image/png")})
    assert r.json()["model_version"] == "v2"


def test_bad_model_keeps_previous_active(client, registry):
    (registry / "v3").mkdir()
    (registry / "v3" / "config.json").write_text(json.dumps({"architecture": "nonexistent", "checkpoint": "model.pth", "input_size": [224, 224], "mean": [0, 0, 0], "std": [1, 1, 1]}))
    shutil.copy(registry / "v1" / "model.pth", registry / "v3" / "model.pth")
    r = client.post("/api/v1/models/activate", json={"version": "v3"})
    assert r.status_code == 400
    assert client.get("/api/v1/model").json()["model_version"] == "v1"
    assert client.post("/api/v1/models/activate", json={"version": "../etc"}).status_code == 400


def test_admin_token(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "admin_token", "secret")
    assert client.post("/api/v1/models/reload").status_code == 401
    assert client.post("/api/v1/models/reload", headers={"X-Admin-Token": "secret"}).status_code == 200
