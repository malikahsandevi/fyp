import { AlertTriangle } from "lucide-react";
import { humanize, type AnalyzeResult } from "@/lib/api";

/**
 * Generated report + retrieved evidence — content and behaviour adapted
 * from the original MedVision frontend's ReportPanel, restyled.
 */
export default function ReportPanel({ result }: { result: AnalyzeResult }) {
  const { report, findings } = result;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl bg-[#FFF3E8] p-4 text-sm font-semibold text-[#EA580C]">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        {report.banner}
      </div>
      <div>
        <h3 className="mb-1 text-sm font-extrabold uppercase tracking-wide text-[#0F1E33]/50">Preliminary Report</h3>
        <p className="whitespace-pre-line text-sm leading-relaxed text-[#0F1E33]/85">{report.text}</p>
        <p className="mt-2 text-xs text-[#0F1E33]/50">Generator: {report.provider}</p>
      </div>
      {report.manual_review_required && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Manual clinical evaluation required.
        </div>
      )}
      {report.notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-xs text-[#0F1E33]/65">
          {report.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      {findings.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[#0F1E33]/50">Retrieved Evidence</h3>
          <div className="space-y-3">
            {findings.map((f) => (
              <details key={f.label} className="rounded-xl border border-black/5 bg-[#F7F9FC] p-4" open={findings.length === 1}>
                <summary className="cursor-pointer text-sm font-bold">
                  {humanize(f.label)}{" "}
                  <span className="font-medium text-[#0F1E33]/50">
                    · {f.contexts.length} source{f.contexts.length === 1 ? "" : "s"}
                  </span>
                </summary>
                {f.contexts.length === 0 && (
                  <p className="mt-2 text-xs text-[#0F1E33]/55">
                    Nothing above the similarity threshold ({result.retrieval.min_score}).
                  </p>
                )}
                {f.contexts.map((c) => (
                  <div key={c.doc_id} className="mt-3 border-t border-black/5 pt-2">
                    <div className="flex justify-between text-xs text-[#0F1E33]/50">
                      <span className="font-semibold">{c.title}</span>
                      <span>similarity {c.score.toFixed(2)}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[#0F1E33]/80">{c.text}</p>
                    <p className="mt-1 text-[11px] text-[#0F1E33]/40">Source: {c.source}</p>
                  </div>
                ))}
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
