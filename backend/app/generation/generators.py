"""Report generators. Both consume the same input and return the same output shape.

findings: [{label, score, threshold, contexts:[{doc_id,title,source,text,score}]}]
returns:  {provider, text, sections:[{label, text, citations}], manual_review_required, notes}

GENERATOR=template  deterministic, offline, text is copied from retrieved context (no hallucination possible)
GENERATOR=llm       any OpenAI-compatible chat API (OpenAI, Ollama, Groq, LM Studio...), temperature 0,
                    closed-book prompt; falls back to the template generator on any error.
"""
import re

import httpx

DISCLAIMER_LINE = "AI-generated preliminary draft for educational use. Not a diagnosis; requires review by a qualified clinician."


def _first_sentences(text: str, n: int = 2) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", " ".join(text.split()))
    return " ".join(sentences[:n])


class TemplateGenerator:
    name = "template"

    def generate(self, findings: list[dict]) -> dict:
        sections, notes, manual = [], [], False
        for f in findings:
            pct = f"{f['score'] * 100:.1f}%"
            if f["contexts"]:
                ctx = f["contexts"][0]
                body = f"The model flagged {f['label'].replace('_', ' ')} (score {pct}). {_first_sentences(ctx['text'])} [1]"
                sections.append({"label": f["label"], "text": body, "citations": [ctx["doc_id"]]})
            else:
                manual = True
                notes.append(f"No sufficiently relevant reference found for {f['label']}; contextual text suppressed.")
                sections.append({"label": f["label"], "text": f"The model flagged {f['label'].replace('_', ' ')} (score {pct}). No reliable reference context was retrieved - manual clinical evaluation required.", "citations": []})
        if not findings:
            text = "No finding exceeded its decision threshold. This does not exclude disease; clinical correlation is required."
        else:
            text = "\n\n".join(f"{i + 1}. {s['text']}" for i, s in enumerate(sections))
        return {"provider": self.name, "text": text, "sections": sections, "manual_review_required": manual or not findings, "notes": notes}


SYSTEM_PROMPT = (
    "You write a short preliminary chest X-ray report draft for a decision-support prototype. "
    "Use ONLY the numbered context passages provided. Do not add facts, diagnoses, or recommendations "
    "that are not in the passages. Cite passages like [1]. If a finding has no context, say that manual "
    "clinical evaluation is required. Never state a definitive diagnosis. Keep each finding to 2-3 sentences."
)


class LLMGenerator:
    def __init__(self, base_url: str, api_key: str, model: str, fallback: TemplateGenerator | None = None):
        self.base_url, self.api_key, self.model = base_url.rstrip("/"), api_key, model
        self.fallback = fallback or TemplateGenerator()
        self.name = f"llm:{model}"

    def generate(self, findings: list[dict]) -> dict:
        if not findings:
            return self.fallback.generate(findings)
        passages, lines = [], []
        for f in findings:
            refs = []
            for c in f["contexts"]:
                passages.append(c["text"])
                refs.append(str(len(passages)))
            lines.append(f"- {f['label']} (model score {f['score']:.2f}); context passages: {', '.join(refs) if refs else 'NONE'}")
        user = "Findings:\n" + "\n".join(lines) + "\n\nContext passages:\n" + "\n".join(f"[{i + 1}] {p}" for i, p in enumerate(passages))
        try:
            resp = httpx.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.model, "temperature": 0, "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}]},
                timeout=60,
            )
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as exc:  # network, auth, bad payload...
            result = self.fallback.generate(findings)
            result["notes"].append(f"LLM unavailable ({type(exc).__name__}); used deterministic template instead.")
            return result
        manual = any(not f["contexts"] for f in findings)
        notes = [f"No reference context for {f['label']}." for f in findings if not f["contexts"]]
        return {"provider": self.name, "text": text, "sections": [], "manual_review_required": manual, "notes": notes}


def build_generator(settings):
    if settings.generator == "llm":
        if not settings.llm_api_key:
            raise RuntimeError("GENERATOR=llm requires LLM_API_KEY")
        return LLMGenerator(settings.llm_base_url, settings.llm_api_key, settings.llm_model)
    return TemplateGenerator()
