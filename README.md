# MedVision AI — Smart Chest X-Ray Analysis (FastAPI backend + Next.js frontend)

Research/demo prototype. **Not for clinical diagnosis.**

## Prototype Demo — How To Run (supervisor demo)

This package is the working prototype phase of the FYP. It runs end-to-end
with NO database and NO login: **database and authentication are intentionally
NOT part of this prototype phase** — they are held for a later phase, per the
project plan. Everything below works exactly as the proposal's 7-step pipeline
describes.

**1. Start the backend** (terminal 1):
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
# API docs: http://localhost:8000/docs   health: http://localhost:8000/health
```

**2. Start the frontend** (terminal 2):
```bash
cd frontend
cp .env.local.example .env.local   # contains NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev                        # http://localhost:3000
```

**3. Demo script (what to show):**
1. Open **http://localhost:3000** — landing page with the upload zone.
2. Upload `backend/tests/sample_xray.png` (or any chest X-ray PNG/JPEG) in
   **Try It Now**. The image is preprocessed (noise reduction + CLAHE contrast
   adjustment + resize + normalize), analyzed by the DenseNet121 model, and
   the Result page opens automatically.
3. On **Result**: read the verdict and confidence, and the score bars for all
   14 findings.
4. Click the **Cardiomegaly** row — the **Grad-CAM** heatmap for that finding
   overlays the X-ray (explainable AI: which region drove the prediction).
5. Scroll to the **report**: the flagged finding is explained with context
   retrieved from the medical knowledge base (RAG), quoted with its citation
   and similarity score. Findings with no reliable retrieved context are
   suppressed and marked "manual clinical evaluation required" instead of
   being invented.
6. Click **Download Report** to save the report as a text file.
7. Open **Models & Knowledge** (top nav): model **v1 (DenseNet121)** is
   active, the knowledge base shows **15 documents** indexed; **Re-index**
   reloads the knowledge base without restarting.
8. Open **History** (top nav): the analysis you just ran is listed and can be
   reopened. (Prototype scope: history lives in this browser only — the
   database phase comes later.)

Proposal documents (proposal + presentation) are in `docs/`.

```
medvision-ai-final/
├─ model_registry/      <- MODELS (alag attach hote hain, backend code se bahar)
│   ├─ active.json         {"active_model": "v1"}
│   └─ v1/ config.json + model.pth
├─ backend/             <- FastAPI (Python)
│   ├─ app/inference/      adapters, model service (hot-swap), predictor, Grad-CAM
│   ├─ app/rag/            knowledge-base loader + cosine retrieval (swappable embedder)
│   ├─ app/generation/     report generator (template offline | any OpenAI-compatible LLM)
│   ├─ knowledge_base/     *.md files (Hassan yahan verified literature dalega)
│   └─ tests/
├─ frontend/            <- Next.js (App Router, TypeScript, Tailwind) — NEW design
└─ docs/                <- FYP proposal document + proposal presentation
```

## Frontend (new design)

The frontend was rebuilt to the new MedVision AI design (orange / dark navy /
peach, top navigation only — no sidebar) and is wired entirely to the real
FastAPI backend below. There is no dummy or sample data anywhere: every score,
finding and report shown comes from `POST /api/v1/analyze`.

Pages:

- `/` — Landing (hero, Key Features, About, footer) with the **Try It Now**
  upload zone. Uploading a PNG/JPEG chest X-ray calls `POST /api/v1/analyze`
  and opens the result view with the real response.
- `/result` — Result view for one analysis: uploaded image with **Grad-CAM**
  viewer (click any score row to retarget the heatmap via
  `POST /api/v1/gradcam?label=...`), overall verdict derived from the real
  predictions vs each class threshold (flagged = score ≥ threshold),
  confidence = top prediction score, score bars for **all** predictions,
  Key Findings, Analysis Details, the real generated report with retrieved
  evidence, and a Download Report (.txt) button. With no analysis, it shows
  an honest empty state.
- `/history` — Analyses actually run in this browser. Each completed analysis
  stores its verbatim backend response + file name + timestamp; the list
  starts empty. "View Result" reopens that stored real response.
- `/models` — Models & Knowledge: registry versions from `GET /api/v1/models`,
  Activate / Reload (`POST /api/v1/models/activate`, `/reload`), knowledge-base
  status (`GET /api/v1/knowledge`) and Re-index (`POST /api/v1/knowledge/reload`).

The backend has no authentication or user accounts, so there is no profile
page — no user data is invented.

Frontend API base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) —
copy `frontend/.env.local.example` to `frontend/.env.local` to change it.

## Run

Backend (WSL/Linux):
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # optional
uvicorn app.main:app --port 8000
# docs: http://localhost:8000/docs
```
Frontend:
```bash
cd frontend
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev                 # http://localhost:3000
```
Tests: `cd backend && pip install -r requirements-dev.txt && pytest`

## Pipeline (POST /api/v1/analyze)
image -> preprocess (noise reduction + CLAHE contrast adjustment -> resize 224x224 -> normalize; toggle `PREPROCESS_ENHANCE=false` to skip enhancement) -> CNN scores -> flagged findings -> knowledge retrieval (cosine similarity >= `RETRIEVAL_MIN_SCORE`) -> report -> JSON.
Agar kisi finding ke liye threshold se upar koi context nahi mila to text suppress hota hai aur "manual evaluation required" dikhta hai.
Grad-CAM: `POST /api/v1/gradcam?label=...` (frontend mein score row click karne par).

## Model update kaise karein (backend/frontend code change nahi)
1. Naya folder `model_registry/v2/` banayein: `model.pth` (`model_state_dict` + ordered `class_names` [+ `metadata`]) aur `config.json` (`architecture`, `checkpoint`, `input_size`, `mean`, `std`, `threshold`, optional `class_thresholds`, `description`).
2. Frontend ke **Models & Knowledge** page par `Activate` dabayein (ya `POST /api/v1/models/activate {"version":"v2"}`). Restart nahi chahiye.
3. Agar load fail ho to purana model active rehta hai (safe rollback).
4. Class list checkpoint se aati hai, isliye classes ki tadaad/tarteeb badal sakti hai; frontend `predictions` list par iterate karta hai.
5. **Nayi architecture** (e.g. EfficientNet-B4): ya to `app/inference/adapters.py` mein `register_architecture(name, build, gradcam_layer)` add karein, ya model folder mein `adapter.py` rakhein (`build_model(num_classes, config)` + optional `gradcam_layer(model)`) aur `ALLOW_MODEL_PLUGINS=true` set karein (kyunke ye code execute karta hai).
Built-in: `densenet121`, `efficientnet_b0`.
Ek ya zyada model path ke liye `MODEL_REGISTRY_DIR` env se registry kahin bhi rakh sakte hain.

## RAG — how it is wired
Retrieval-Augmented Generation is **on by default** and needs no extra setup:
at backend startup the retriever (`backend/app/rag/retriever.py`, TF-IDF +
cosine similarity, `EMBEDDER=tfidf`) indexes every `backend/knowledge_base/*.md`
file (15 documents / 15 chunks). In `POST /api/v1/analyze`, each flagged finding
(score ≥ its threshold) is queried against the index; only contexts with cosine
similarity ≥ `RETRIEVAL_MIN_SCORE` (default 0.15) are attached to the finding
(`grounded: true`) and quoted in the generated report with a citation. A flagged
finding with **no** context above the threshold gets no invented text — its
report section says "manual clinical evaluation required", the context is marked
suppressed in the report notes, and `manual_review_required` is set.
Check it live: `GET /api/v1/knowledge` returns the indexed counts. After editing
knowledge-base files, re-index without restarting from the frontend's
**Models & Knowledge** page (**Re-index** button) or via
`POST /api/v1/knowledge/reload` (sends `X-Admin-Token` if `ADMIN_TOKEN` is set).

## Knowledge base / LLM
- `backend/knowledge_base/*.md` (front-matter: `title`, `labels`, `source`). Shuruaati files **sample hain, verified clinical source nahi** — replace karein, phir UI se *Re-index*.
- Embedder: `EMBEDDER=tfidf` (default, offline) ya `sentence-transformers` (tab `RETRIEVAL_MIN_SCORE=0.75` rakhein jaisa proposal mein hai).
- Report: `GENERATOR=template` (default, offline, deterministic) ya `GENERATOR=llm` + `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` (OpenAI/Ollama/Groq etc., temperature 0, closed-book prompt, error par template fallback).

## API
`GET /health` · `GET /api/v1/model` · `GET /api/v1/models` · `POST /api/v1/models/activate` · `POST /api/v1/models/reload` · `GET /api/v1/knowledge` · `POST /api/v1/knowledge/reload` · `POST /api/v1/predict` · `POST /api/v1/analyze` · `POST /api/v1/gradcam`
Admin endpoints ke liye `ADMIN_TOKEN` set karein (header `X-Admin-Token`).

## Abhi prototype mein nahi
Authentication/users, database (MongoDB history), deployment/Docker — proposal ke mutabiq aglay phases mein. (Preprocessing CLAHE/denoise ab prototype mein shamil hai.)
Training-parity caveat: 1024->224 resize training cache se match karna baqi hai (purani README dekhein).
