from pathlib import Path

from app.generation.generators import TemplateGenerator
from app.rag import Retriever

KB = Path(__file__).resolve().parents[1] / "knowledge_base"


def test_retrieval_finds_matching_doc_and_respects_threshold():
    r = Retriever()
    assert r.build(KB) > 10
    hits = r.search("Cardiomegaly", 2, 0.15, label="Cardiomegaly")
    assert hits and hits[0]["title"] == "Cardiomegaly"
    assert r.search("cardiomegaly", 1, 0.15)[0]["title"] == "Cardiomegaly"  # works even without label tag
    assert r.search("quantum chromodynamics lattice", 2, 0.15) == []


def test_template_generator_suppresses_without_context():
    g = TemplateGenerator()
    out = g.generate([{"label": "Mass", "score": 0.9, "threshold": 0.5, "flagged": True, "contexts": []}])
    assert out["manual_review_required"] and "manual clinical evaluation" in out["text"].lower()
    assert g.generate([])["manual_review_required"]


def test_every_label_has_kb_doc():
    r = Retriever(); r.build(KB)
    labels = {l for c in r.chunks for l in c.labels}
    for name in ["Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass", "Nodule", "Pneumonia", "Pneumothorax", "Consolidation", "Edema", "Emphysema", "Fibrosis", "Pleural_Thickening", "Hernia"]:
        assert name in labels
