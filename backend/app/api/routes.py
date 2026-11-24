from io import BytesIO

from fastapi import APIRouter, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel

from ..config import settings
from ..inference.gradcam import generate_gradcam_png
from ..inference.predictor import predict
from ..pipeline import DISCLAIMER, analyze

router = APIRouter()
ALLOWED_FORMATS = {"PNG", "JPEG"}


def _require_admin(token: str | None):
    if settings.admin_token and token != settings.admin_token:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Admin-Token")


async def _read_image(file: UploadFile) -> Image.Image:
    try:
        contents = await file.read(settings.max_file_bytes + 1)
    finally:
        await file.close()
    if not contents:
        raise HTTPException(400, "Upload a non-empty PNG or JPEG image")
    if len(contents) > settings.max_file_bytes:
        raise HTTPException(413, "Image must be 10 MB or smaller")
    try:
        with Image.open(BytesIO(contents)) as src:
            if src.format not in ALLOWED_FORMATS:
                raise HTTPException(415, "Only PNG and JPEG images are supported")
            if src.width * src.height > settings.max_image_pixels:
                raise HTTPException(413, "Image dimensions are too large")
            src.load()
            return src.copy()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(400, "File is not a valid image") from exc


# ---- health / info ----------------------------------------------------------
@router.get("/health")
def health(request: Request):
    s = request.app.state
    return {"status": "ok", "model_version": s.service.bundle["version"], "generator": s.generator.name, "knowledge_base": s.retriever.stats()}


@router.get("/api/v1/model")
def model_info(request: Request):
    return request.app.state.service.info()


# ---- model management (models are external to the backend) -------------------
@router.get("/api/v1/models")
def list_models(request: Request):
    return {"registry_dir": str(request.app.state.service.registry_dir), "versions": request.app.state.service.list_versions()}


class ActivateBody(BaseModel):
    version: str


@router.post("/api/v1/models/activate")
async def activate_model(body: ActivateBody, request: Request, x_admin_token: str | None = Header(default=None)):
    _require_admin(x_admin_token)
    try:
        await run_in_threadpool(request.app.state.service.activate, body.version)
    except (FileNotFoundError, ValueError, KeyError, RuntimeError) as exc:
        raise HTTPException(400, f"Could not activate '{body.version}': {exc}. Previous model is still active.") from exc
    return request.app.state.service.info()


@router.post("/api/v1/models/reload")
async def reload_model(request: Request, x_admin_token: str | None = Header(default=None)):
    _require_admin(x_admin_token)
    try:
        await run_in_threadpool(request.app.state.service.reload)
    except (FileNotFoundError, ValueError, KeyError, RuntimeError) as exc:
        raise HTTPException(400, f"Reload failed: {exc}. Previous model is still active.") from exc
    return request.app.state.service.info()


# ---- knowledge base ---------------------------------------------------------
@router.get("/api/v1/knowledge")
def knowledge_status(request: Request):
    return request.app.state.retriever.stats()


@router.post("/api/v1/knowledge/reload")
async def knowledge_reload(request: Request, x_admin_token: str | None = Header(default=None)):
    _require_admin(x_admin_token)
    await run_in_threadpool(request.app.state.retriever.build, settings.knowledge_base_dir)
    return request.app.state.retriever.stats()


# ---- inference --------------------------------------------------------------
@router.post("/api/v1/predict")
async def predict_endpoint(request: Request, file: UploadFile = File(...)):
    image = await _read_image(file)
    service = request.app.state.service

    def work():
        with service.lock:
            return {"schema_version": "1.0", **predict(service.bundle, image), "disclaimer": DISCLAIMER}

    return await run_in_threadpool(work)


@router.post("/api/v1/analyze")
async def analyze_endpoint(request: Request, file: UploadFile = File(...)):
    image = await _read_image(file)
    s = request.app.state
    return await run_in_threadpool(analyze, s.service, s.retriever, s.generator, settings, image)


@router.post("/api/v1/gradcam", responses={200: {"content": {"image/png": {}}}})
async def gradcam(request: Request, file: UploadFile = File(...), label: str = Query(..., description="Exact class label from GET /api/v1/model")):
    service = request.app.state.service
    if label not in service.bundle["class_names"]:
        raise HTTPException(400, "Unknown class label. See GET /api/v1/model")
    image = await _read_image(file)

    def work():
        with service.lock:
            return service.bundle["version"], generate_gradcam_png(service.bundle, image, label)

    try:
        version, png = await run_in_threadpool(work)
    except NotImplementedError as exc:
        raise HTTPException(501, str(exc)) from exc
    return Response(content=png, media_type="image/png", headers={"Cache-Control": "no-store", "X-Model-Version": version})
