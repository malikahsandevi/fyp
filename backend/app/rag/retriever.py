"""Knowledge base loading, embedding and cosine-similarity retrieval.

Embedders are swappable via EMBEDDER env:
  tfidf                  - pure numpy, zero downloads (default, good for prototype)
  sentence-transformers  - dense embeddings (pip install sentence-transformers)
Knowledge base = *.md files in KNOWLEDGE_BASE_DIR, updatable without code change.
"""
import math
import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

_TOKEN = re.compile(r"[a-z0-9]+")
_STOP = set("a an and are as at be by for from has in is it of on or that the this to was were with which can may often when".split())


def _tokens(text: str) -> list[str]:
    return [t for t in _TOKEN.findall(text.lower()) if t not in _STOP and len(t) > 1]


class TfidfEmbedder:
    name = "tfidf"

    def __init__(self):
        self.vocab: dict[str, int] = {}
        self.idf: np.ndarray = np.zeros(0)

    def fit(self, texts: list[str]) -> None:
        docs = [set(_tokens(t)) for t in texts]
        df = Counter(tok for d in docs for tok in d)
        self.vocab = {tok: i for i, tok in enumerate(sorted(df))}
        n = max(len(texts), 1)
        self.idf = np.array([math.log((1 + n) / (1 + df[t])) + 1 for t in self.vocab], dtype=np.float32)

    def encode(self, texts: list[str]) -> np.ndarray:
        mat = np.zeros((len(texts), len(self.vocab)), dtype=np.float32)
        for row, text in enumerate(texts):
            for tok, count in Counter(_tokens(text)).items():
                idx = self.vocab.get(tok)
                if idx is not None:
                    mat[row, idx] = (1 + math.log(count)) * self.idf[idx]
        norms = np.linalg.norm(mat, axis=1, keepdims=True)
        return mat / np.where(norms == 0, 1, norms)


class SentenceTransformerEmbedder:
    def __init__(self, model_name: str):
        from sentence_transformers import SentenceTransformer  # optional dependency
        self.name = model_name
        self._model = SentenceTransformer(model_name)

    def fit(self, texts: list[str]) -> None:
        pass

    def encode(self, texts: list[str]) -> np.ndarray:
        return np.asarray(self._model.encode(texts, normalize_embeddings=True), dtype=np.float32)


@dataclass
class Chunk:
    doc_id: str
    title: str
    source: str
    labels: list[str]
    text: str


@dataclass
class Retriever:
    embedder_kind: str = "tfidf"
    embedder_model: str = ""
    chunks: list[Chunk] = field(default_factory=list)

    def __post_init__(self):
        self._embedder = None
        self._matrix = np.zeros((0, 0), dtype=np.float32)

    # ---- indexing -----------------------------------------------------------
    @staticmethod
    def _parse(path: Path) -> list[Chunk]:
        raw = path.read_text(encoding="utf-8")
        meta: dict[str, str] = {}
        if raw.startswith("---"):
            _, front, raw = raw.split("---", 2)
            for line in front.strip().splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    meta[k.strip().lower()] = v.strip()
        title = meta.get("title", path.stem.replace("_", " ").title())
        labels = [x.strip() for x in meta.get("labels", "").split(",") if x.strip()]
        chunks, buf = [], ""
        for para in (p.strip() for p in raw.strip().split("\n\n")):
            if not para:
                continue
            if buf and len(buf) + len(para) > 700:
                chunks.append(buf)
                buf = ""
            buf = f"{buf}\n\n{para}".strip()
        if buf:
            chunks.append(buf)
        return [Chunk(f"{path.stem}#{i}", title, meta.get("source", path.name), labels, c) for i, c in enumerate(chunks)]

    def build(self, kb_dir: Path) -> int:
        chunks: list[Chunk] = []
        if Path(kb_dir).is_dir():
            for p in sorted(Path(kb_dir).glob("*.md")):
                chunks.extend(self._parse(p))
        embedder = SentenceTransformerEmbedder(self.embedder_model) if self.embedder_kind == "sentence-transformers" else TfidfEmbedder()
        texts = [f"{c.title}. {c.text}" for c in chunks]
        embedder.fit(texts)
        matrix = embedder.encode(texts) if texts else np.zeros((0, 0), dtype=np.float32)
        # swap in atomically
        self._embedder, self._matrix, self.chunks = embedder, matrix, chunks
        return len(chunks)

    # ---- search -------------------------------------------------------------
    def search(self, query: str, top_k: int, min_score: float, label: str | None = None) -> list[dict]:
        if not self.chunks or self._embedder is None:
            return []
        q = self._embedder.encode([query])[0]
        scores = self._matrix @ q  # unit vectors => cosine similarity
        # Hybrid ranking: documents tagged with the finding's label rank first.
        # The reported/thresholded value stays the pure cosine similarity.
        boost = np.array([0.5 if label and label in c.labels else 0.0 for c in self.chunks], dtype=np.float32)
        order = np.argsort(-(scores + boost))[:top_k]
        out = []
        for i in order:
            if float(scores[i]) < min_score:
                continue  # below threshold: never passed to the generator
            c = self.chunks[int(i)]
            out.append({"doc_id": c.doc_id, "title": c.title, "source": c.source, "text": c.text, "score": round(float(scores[i]), 4)})
        return out

    def stats(self) -> dict:
        return {"chunks": len(self.chunks), "documents": len({c.doc_id.split("#")[0] for c in self.chunks}), "embedder": getattr(self._embedder, "name", None)}
