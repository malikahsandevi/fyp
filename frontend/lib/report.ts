import { humanize, type AnalyzeResult } from "./api";
import { flaggedPredictions, formatDisplayDate, topPrediction, type HistoryEntry } from "./history";

/** Builds a plain-text report from a REAL stored analyze response and downloads it. */
export function downloadReport(entry: HistoryEntry) {
  const r: AnalyzeResult = entry.result;
  const top = topPrediction(r);
  const flagged = flaggedPredictions(r);
  const lines: string[] = [
    "MedVision AI — Chest X-Ray Analysis Report",
    "==========================================",
    "",
    `File: ${entry.fileName}`,
    `Analysis Date: ${formatDisplayDate(entry.createdAt)}`,
    `Model Used: ${r.architecture} (version ${r.model_version})`,
    `Overall Verdict: ${flagged.length > 0 ? "Abnormal" : "Normal"}`,
    top ? `Top Score: ${humanize(top.label)} — ${(top.score * 100).toFixed(1)}%` : "",
    "",
    "All Model Scores (raw outputs, threshold = flagged cut-off):",
    ...r.predictions.map(
      (p) => `  - ${humanize(p.label)}: ${(p.score * 100).toFixed(1)}% (threshold ${(p.threshold * 100).toFixed(0)}%${p.flagged ? ", FLAGGED" : ""})`
    ),
    "",
    "Flagged Findings:",
    ...(r.findings.length
      ? r.findings.map((f) => `  - ${humanize(f.label)}: ${(f.score * 100).toFixed(1)}%${f.grounded ? "" : " (no grounded literature — manual evaluation required)"}`)
      : ["  - None — no class crossed its decision threshold."]),
    "",
    "Generated Report:",
    r.report.text,
    "",
    ...(r.report.notes.length ? ["Notes:", ...r.report.notes.map((n) => `  - ${n}`), ""] : []),
    `Disclaimer: ${r.disclaimer}`,
    `Banner: ${r.report.banner}`,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `medvision-report-${entry.fileName.replace(/\.[^.]+$/, "")}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
