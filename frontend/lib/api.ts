/**
 * API client for the REAL MedVision AI FastAPI backend.
 * Adapted from the original MedVision frontend (same request/response
 * contracts) — every value shown in the UI comes from this backend.
 *
 * Backend base URL: NEXT_PUBLIC_API_URL (default http://localhost:8000).
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type Prediction = { label: string; score: number; threshold: number; flagged: boolean };
export type Context = { doc_id: string; title: string; source: string; text: string; score: number };
export type Finding = Prediction & { contexts: Context[]; grounded: boolean };
export type Report = {
  provider: string;
  text: string;
  sections: { label: string; text: string; citations: string[] }[];
  manual_review_required: boolean;
  notes: string[];
  banner: string;
};
export type AnalyzeResult = {
  schema_version: string;
  model_version: string;
  architecture: string;
  input: { original_size_wh: number[]; processed_size_hw: number[] };
  predictions: Prediction[];
  findings: Finding[];
  report: Report;
  retrieval: { min_score: number; top_k: number; chunks: number; documents: number; embedder: string | null };
  disclaimer: string;
};
export type ModelInfo = {
  model_version: string;
  architecture: string;
  num_classes: number;
  class_names: string[];
  input_size: number[];
  threshold: number;
  device: string;
  gradcam_supported: boolean;
};
export type ModelVersion = { version: string; architecture: string | null; description: string; active: boolean; loaded: boolean };

async function errorFrom(res: Response): Promise<Error> {
  let detail = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
  } catch {}
  return new Error(detail);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { cache: "no-store", ...init });
  } catch {
    throw new Error(`Cannot reach backend at ${API_URL}. Is it running?`);
  }
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

function form(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return fd;
}

export const api = {
  analyze: (file: File) => request<AnalyzeResult>("/api/v1/analyze", { method: "POST", body: form(file) }),
  modelInfo: () => request<ModelInfo>("/api/v1/model"),
  listModels: () => request<{ registry_dir: string; versions: ModelVersion[] }>("/api/v1/models"),
  knowledge: () => request<{ chunks: number; documents: number; embedder: string | null }>("/api/v1/knowledge"),
  activate: (version: string, token?: string) =>
    request<ModelInfo>("/api/v1/models/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { "X-Admin-Token": token } : {}) },
      body: JSON.stringify({ version }),
    }),
  reloadModel: (token?: string) =>
    request<ModelInfo>("/api/v1/models/reload", { method: "POST", headers: token ? { "X-Admin-Token": token } : {} }),
  reloadKnowledge: (token?: string) =>
    request<{ chunks: number }>("/api/v1/knowledge/reload", { method: "POST", headers: token ? { "X-Admin-Token": token } : {} }),
  async gradcam(file: File, label: string, signal?: AbortSignal): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/v1/gradcam?label=${encodeURIComponent(label)}`, { method: "POST", body: form(file), signal });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      throw new Error(`Cannot reach backend at ${API_URL}.`);
    }
    if (!res.ok) throw await errorFrom(res);
    return URL.createObjectURL(await res.blob());
  },
};

/** "Pleural_Thickening" -> "Pleural Thickening" */
export function humanize(label: string): string {
  return label.replace(/_/g, " ");
}
