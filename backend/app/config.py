"""Central settings. Everything that may change between deployments is an env var.

The model registry lives OUTSIDE the backend package on purpose: models are
swapped/updated by dropping a new folder in MODEL_REGISTRY_DIR, no code change.
"""
import os
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent


def _load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(BACKEND_ROOT / ".env")


def _bool(name: str, default: bool) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    model_registry_dir: Path = field(default_factory=lambda: Path(os.environ.get("MODEL_REGISTRY_DIR", PROJECT_ROOT / "model_registry")))
    knowledge_base_dir: Path = field(default_factory=lambda: Path(os.environ.get("KNOWLEDGE_BASE_DIR", BACKEND_ROOT / "knowledge_base")))
    # Executing adapter.py found inside a model folder is code execution: opt-in only.
    allow_model_plugins: bool = field(default_factory=lambda: _bool("ALLOW_MODEL_PLUGINS", False))
    cors_origins: list[str] = field(default_factory=lambda: [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()])
    # If set, model/knowledge admin endpoints require header X-Admin-Token.
    admin_token: str = field(default_factory=lambda: os.environ.get("ADMIN_TOKEN", ""))

    # RAG
    embedder: str = field(default_factory=lambda: os.environ.get("EMBEDDER", "tfidf"))  # tfidf | sentence-transformers
    embedder_model: str = field(default_factory=lambda: os.environ.get("EMBEDDER_MODEL", "sentence-transformers/all-MiniLM-L6-v2"))
    retrieval_top_k: int = field(default_factory=lambda: int(os.environ.get("RETRIEVAL_TOP_K", "2")))
    # TF-IDF cosine scores are lower than dense-embedding scores; with
    # sentence-transformers use ~0.75 as in the proposal.
    retrieval_min_score: float = field(default_factory=lambda: float(os.environ.get("RETRIEVAL_MIN_SCORE", "0.15")))
    max_findings: int = field(default_factory=lambda: int(os.environ.get("MAX_FINDINGS", "3")))

    # Report generation
    generator: str = field(default_factory=lambda: os.environ.get("GENERATOR", "template"))  # template | llm
    llm_base_url: str = field(default_factory=lambda: os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1"))
    llm_api_key: str = field(default_factory=lambda: os.environ.get("LLM_API_KEY", ""))
    llm_model: str = field(default_factory=lambda: os.environ.get("LLM_MODEL", "gpt-4o-mini"))

    # Upload limits
    max_file_bytes: int = 10 * 1024 * 1024
    max_image_pixels: int = 20_000_000


settings = Settings()
