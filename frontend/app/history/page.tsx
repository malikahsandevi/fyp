"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, CloudUpload, Download, Eye, History } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import XrayVisual from "@/components/XrayVisual";
import { formatDisplayDate, isAbnormal, loadHistory, topPrediction, type HistoryEntry } from "@/lib/history";
import { downloadReport } from "@/lib/report";

type Filter = "All Results" | "Normal" | "Abnormal";

export default function HistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("All Results");

  useEffect(() => {
    setRecords(loadHistory());
  }, []);

  const visible = useMemo(
    () =>
      filter === "All Results"
        ? records
        : records.filter((r) => (isAbnormal(r.result) ? "Abnormal" : "Normal") === filter),
    [records, filter]
  );

  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF3E8] text-[#F97316]">
              <History size={25} />
            </span>
            <div>
              <h1 className="text-3xl font-extrabold">My History</h1>
              <p className="text-sm text-[#0F1E33]/60">Your past analysis reports — real runs against the MedVision AI backend</p>
            </div>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-[#F97316]"
            aria-label="Filter results"
          >
            <option>All Results</option>
            <option>Normal</option>
            <option>Abnormal</option>
          </select>
        </div>

        <div className="mt-8 space-y-5">
          {visible.map((r) => {
            const abnormal = isAbnormal(r.result);
            const top = topPrediction(r.result);
            return (
              <div key={r.id} className="card flex flex-wrap items-center gap-5 p-5">
                {r.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.imageDataUrl} alt={`Chest X-ray — ${r.fileName}`} className="h-[86px] w-[104px] shrink-0 rounded-xl bg-black object-cover" />
                ) : (
                  <XrayVisual small className="h-[86px] w-[104px] shrink-0 rounded-xl" />
                )}
                <div className="min-w-[190px]">
                  <p className="font-extrabold">{r.fileName}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[#0F1E33]/55">
                    <CalendarDays size={13} /> {formatDisplayDate(r.createdAt)}
                  </p>
                  <p className="mt-0.5 text-xs text-[#0F1E33]/45">
                    {r.result.architecture} · {r.result.model_version}
                  </p>
                </div>
                <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${abnormal ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                  {abnormal ? "Abnormal" : "Normal"}
                </span>
                <div className="border-l border-black/5 pl-5">
                  <p className="text-xl font-extrabold">{top ? (top.score * 100).toFixed(1) : "0.0"}%</p>
                  <p className="text-xs text-[#0F1E33]/55">Top Score{top ? ` · ${top.label.replace(/_/g, " ")}` : ""}</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/result?id=${encodeURIComponent(r.id)}`)}
                    className="flex items-center gap-2 rounded-xl border border-[#F97316] px-4 py-2.5 text-sm font-bold text-[#0F1E33] transition hover:bg-[#FFF3E8]"
                  >
                    <Eye size={16} className="text-[#F97316]" /> View Result
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadReport(r)}
                    className="flex items-center gap-2 rounded-xl border border-[#F97316] px-4 py-2.5 text-sm font-bold text-[#0F1E33] transition hover:bg-[#FFF3E8]"
                  >
                    <Download size={16} className="text-[#F97316]" /> Download
                  </button>
                </div>
              </div>
            );
          })}
          {visible.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-sm text-[#0F1E33]/60">
                {records.length === 0
                  ? "No analyses yet — your history is empty. Upload a chest X-ray and your real results will appear here."
                  : `No ${filter.toLowerCase()} results yet.`}
              </p>
              {records.length === 0 && (
                <Link
                  href="/#try"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#F97316] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#EA580C]"
                >
                  <CloudUpload size={16} /> Upload X-Ray
                </Link>
              )}
            </div>
          )}
        </div>

        {visible.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2.5">
            <button type="button" aria-label="Previous page" className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white">
              <ChevronLeft size={17} />
            </button>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F97316] text-sm font-bold text-white">1</span>
            <button type="button" aria-label="Next page" className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white">
              <ChevronRight size={17} />
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
