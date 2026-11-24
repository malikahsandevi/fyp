/**
 * Browser history of analyses that were REALLY run against the backend.
 *
 * Every entry stores the verbatim AnalyzeResult returned by
 * POST /api/v1/analyze (plus the file name and the time it ran).
 * The list starts EMPTY — there are no sample or fabricated records.
 * The backend itself is stateless about history (see README), so the
 * browser keeps the real responses it received.
 */
import type { AnalyzeResult } from "./api";

export interface HistoryEntry {
  id: string;
  fileName: string;
  /** ISO timestamp of when the analysis completed */
  createdAt: string;
  result: AnalyzeResult;
  /** Data URL of the uploaded image, kept when small enough for localStorage */
  imageDataUrl?: string;
}

const KEY = "medvision-history-v1";
/** Only persist the image inline when it is comfortably small. */
const MAX_IMAGE_DATAURL = 3_500_000;

let lastFile: File | null = null;
/** Keeps the just-analyzed File in memory so Grad-CAM works in-session
 *  even when the image was too large to persist as a data URL. */
export function setLastFile(file: File | null) {
  lastFile = file;
}
export function getLastFile(): File | null {
  return lastFile;
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function persist(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded — retry without inline images.
    try {
      localStorage.setItem(KEY, JSON.stringify(entries.map(({ imageDataUrl: _drop, ...rest }) => rest)));
    } catch {
      /* storage unavailable — history simply will not persist */
    }
  }
}

export function addToHistory(entry: HistoryEntry): HistoryEntry[] {
  const entries = [entry, ...loadHistory().filter((e) => e.id !== entry.id)];
  persist(entries);
  return entries;
}

export function getHistoryEntry(id: string): HistoryEntry | null {
  return loadHistory().find((e) => e.id === id) ?? null;
}

export function readFileAsDataUrl(file: File): Promise<string | undefined> {
  if (file.size > MAX_IMAGE_DATAURL) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

export async function fileFromDataUrl(dataUrl: string, name: string): Promise<File | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], name, { type: blob.type || "image/png" });
  } catch {
    return null;
  }
}

/** Verdict helpers derived from the REAL predictions in a stored result. */
export function topPrediction(result: AnalyzeResult) {
  return result.predictions[0] ?? null;
}
export function flaggedPredictions(result: AnalyzeResult) {
  return result.predictions.filter((p) => p.flagged);
}
export function isAbnormal(result: AnalyzeResult): boolean {
  return flaggedPredictions(result).length > 0;
}

export function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${date} • ${time}`;
}
