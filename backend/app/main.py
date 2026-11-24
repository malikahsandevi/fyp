"""MedVision AI backend. Run: uvicorn app.main:app --port 8000"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .config import settings
from .generation import build_generator
from .inference import ModelService
from .rag import Retriever


@asynccontextmanager
async def lifespan(app: FastAPI):
    service = ModelService(settings.model_registry_dir, allow_plugins=settings.allow_model_plugins)
    service.load_active()
    retriever = Retriever(settings.embedder, settings.embedder_model)
    retriever.build(settings.knowledge_base_dir)
    app.state.service = service
    app.state.retriever = retriever
    app.state.generator = build_generator(settings)
    yield


app = FastAPI(title="MedVision AI API", version="0.3.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["X-Model-Version"],
)
app.include_router(router)
