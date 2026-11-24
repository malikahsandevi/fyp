"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle, BarChart3, CalendarDays, Check, CloudUpload, Cpu, Download, FileText, Heart,
  Image as ImageIcon, Info, Lightbulb, Loader2, RotateCcw, CheckCircle2,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Viewer from "@/components/Viewer";
import ScoreBars from "@/components/ScoreBars";
import ReportPanel from "@/components/ReportPanel";
import XrayVisual from "@/components/XrayVisual";
import { humanize } from "@/lib/api";
import {
  fileFromDataUrl, flaggedPredictions, formatDisplayDate, getHistoryEntry, getLastFile,
  isAbnormal, topPrediction, type HistoryEntry,
} from "@/lib/history";
import { downloadReport } from "@/lib/report";

function ResultContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [entry, setEntry] = useState<HistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    (async () => {
      const found = id ? getHistoryEntry(id) : null;
      setEntry(found);
      if (found) {
        setSelected(found.result.predictions[0]?.label ?? "");
        const last = getLastFile();
        if (last && last.name === found.fileName) {
          setFile(last);
          setFilePreview(URL.createObjectURL(last));
        } else if (found.imageDataUrl) {
          setFile(await fileFromDataUrl(found.imageDataUrl, found.fileName));
          setFilePreview(found.imageDataUrl);
        }
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto flex max-w-7xl items-center justify-center px-5 py-32">
        <Loader2 className="animate-spin text-[#F97316]" size={32} />
      </main>
    );
  }

  if (!entry) {
    return (
      <main className="mx-auto max-w-7xl px-5 pb-16 pt-10 lg:px-8">
        <div className="card mx-auto max-w-2xl p-10 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF3E8] text-[#F97316]">
            <CloudUpload size={30} />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold">No analysis yet</h1>
          <p className="mt-3 text-base text-[#0F1E33]/70">
            No analysis yet — upload a chest X-ray to get started. Your result from the MedVision AI
            model will appear here.
          </p>
          <Link
            href="/#try"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#F97316] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#EA580C]"
          >
            <CloudUpload size={17} /> Upload X-Ray
          </Link>
        </div>
      </main>
    );
  }

  const result = entry.result;
  const abnormal = isAbnormal(result);
  const flagged = flaggedPredictions(result);
  const top = topPrediction(result);
  const confidence = top ? top.score * 100 : 0;

  return (
    <main className="mx-auto max-w-7xl px-5 pb-10 pt-8 lg:px-8">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#FDEBD7] px-7 py-6">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
            <Check size={26} strokeWidth={3} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">Analysis Completed!</h1>
            <p className="text-sm text-[#0F1E33]/70">Here are the results for your X-ray image.</p>
          </div>
        </div>
        <Heart className="absolute right-8 top-1/2 hidden -translate-y-1/2 text-[#F97316]" size={34} />
        <svg className="absolute right-24 top-1/2 hidden -translate-y-1/2 md:block" width="150" height="36" viewBox="0 0 150 36" aria-hidden="true">
          <polyline points="0,18 34,18 44,6 56,30 66,18 96,18 104,10 112,26 118,18 150,18" fill="none" stroke="#F97316" strokeWidth="2" opacity="0.55" />
        </svg>
      </div>

      {/* Main result card */}
      <div className="card mt-8 grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_1.25fr]">
        <div>
          {file && filePreview ? (
            <Viewer file={file} previewUrl={filePreview} label={selected} />
          ) : entry.imageDataUrl ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.imageDataUrl} alt={`Chest X-ray — ${entry.fileName}`} className="aspect-square w-full rounded-2xl bg-black object-contain" />
              <p className="mt-2 text-xs text-[#0F1E33]/55">Grad-CAM is unavailable for this stored entry — re-run the analysis to view heatmaps.</p>
            </div>
          ) : (
            <div>
              <XrayVisual className="aspect-square w-full rounded-2xl" />
              <p className="mt-2 text-xs text-[#0F1E33]/55">The original image was too large to keep in browser storage — re-run the analysis to view it with Grad-CAM.</p>
            </div>
          )}
        </div>
        <div>
          <div className="flex items-start justify-between gap-4">
            <span className="rounded-full bg-[#FFF3E8] px-4 py-1.5 text-sm font-bold text-[#F97316]">Prediction Result</span>
            <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-white ${abnormal ? "bg-red-500" : "bg-green-500"}`}>
              {abnormal ? <AlertTriangle size={30} /> : <Check size={34} strokeWidth={3} />}
            </span>
          </div>
          <h2 className="mt-3 text-5xl font-extrabold sm:text-6xl">{abnormal ? "Abnormal" : "Normal"}</h2>
          <p className="mt-2 text-base text-[#0F1E33]/70">
            {abnormal
              ? `The model flagged ${flagged.map((f) => humanize(f.label)).join(", ")} — please consult a qualified doctor.`
              : "No major abnormalities detected in this X-ray — no class crossed its decision threshold."}
          </p>
          <div className="mt-7 flex items-end justify-between">
            <span className="text-sm font-semibold text-[#0F1E33]/70">Confidence Score{top ? ` — ${humanize(top.label)}` : ""}</span>
            <span className="text-2xl font-extrabold">{confidence.toFixed(1)}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/5">
            <div className={`h-full rounded-full ${abnormal ? "bg-red-400" : "bg-green-500"}`} style={{ width: `${confidence}%` }} />
          </div>

          <div className="mt-7 rounded-2xl bg-[#F7F9FC] p-5">
            <h3 className="flex items-center gap-2 text-base font-extrabold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F97316] text-white">
                <Info size={14} />
              </span>
              Key Findings
            </h3>
            {result.findings.length > 0 ? (
              <ul className="mt-3 space-y-2.5">
                {result.findings.map((f) => (
                  <li key={f.label} className="flex items-center gap-2.5 text-sm font-medium text-[#0F1E33]/85">
                    <CheckCircle2 size={18} className="shrink-0 text-[#F97316]" />
                    {humanize(f.label)} — {(f.score * 100).toFixed(1)}% (threshold {(f.threshold * 100).toFixed(0)}%)
                    {!f.grounded && <span className="text-[#0F1E33]/50">· manual evaluation required</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 flex items-center gap-2.5 text-sm font-medium text-[#0F1E33]/85">
                <CheckCircle2 size={18} className="shrink-0 text-green-500" />
                No finding crossed the model&apos;s decision threshold.
              </p>
            )}
          </div>

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-extrabold text-[#0F1E33]/80">
              Model Scores <span className="font-medium normal-case text-[#0F1E33]/50">(click a row to change the Grad-CAM target)</span>
            </h3>
            <ScoreBars predictions={result.predictions} selected={selected} onSelect={setSelected} />
          </div>
        </div>
      </div>

      {/* Details + Report */}
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <div className="card p-7">
            <h3 className="flex items-center gap-2.5 text-xl font-extrabold">
              <FileText className="text-[#F97316]" /> Analysis Details
            </h3>
            <dl className="mt-5 divide-y divide-black/5 text-sm">
              {[
                { Icon: ImageIcon, label: "Image Type", value: "Chest X-Ray" },
                { Icon: CalendarDays, label: "Analysis Date", value: formatDisplayDate(entry.createdAt) },
                { Icon: Cpu, label: "Model Used", value: `${result.architecture} · ${result.model_version}` },
                { Icon: BarChart3, label: "Confidence", value: `${confidence.toFixed(1)}%` },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="grid grid-cols-[28px_1fr_1.2fr] items-center py-3.5">
                  <Icon size={18} className="text-[#16283F]" />
                  <dt className="font-semibold text-[#0F1E33]/70">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 truncate text-xs text-[#0F1E33]/45">File: {entry.fileName}</p>
          </div>
          <div className="card p-7">
            <h3 className="flex items-center gap-2.5 text-xl font-extrabold">
              <Lightbulb className="text-[#F97316]" /> About This Result
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-[#0F1E33]/75">
              Our AI model analyzed your chest X-ray using advanced deep learning techniques. This result
              indicates {abnormal ? "possible abnormalities" : "no major abnormalities"}, but for a final
              diagnosis, please consult a qualified doctor.
            </p>
            <p className="mt-5 flex items-start gap-2.5 rounded-xl bg-[#FFF3E8] p-4 text-sm font-semibold text-[#EA580C]">
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              Note: {result.disclaimer}
            </p>
          </div>
        </div>
        <div className="card p-7">
          <ReportPanel result={result} />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-10 flex flex-wrap justify-center gap-5">
        <button
          type="button"
          onClick={() => downloadReport(entry)}
          className="flex items-center gap-2.5 rounded-full bg-[#F97316] px-9 py-4 text-base font-bold text-white shadow-[0_14px_28px_-12px_rgba(249,115,22,0.9)] transition hover:bg-[#EA580C]"
        >
          <Download size={20} /> Download Report
        </button>
        <Link
          href="/#try"
          className="flex items-center gap-2.5 rounded-full border-2 border-[#F97316] bg-white px-9 py-4 text-base font-bold text-[#0F1E33] transition hover:bg-[#FFF3E8]"
        >
          <RotateCcw size={19} /> Analyze Another Image
        </Link>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      <Header />
      <Suspense
        fallback={
          <main className="mx-auto flex max-w-7xl items-center justify-center px-5 py-32">
            <Loader2 className="animate-spin text-[#F97316]" size={32} />
          </main>
        }
      >
        <ResultContent />
      </Suspense>
      <div className="h-10 bg-gradient-to-b from-transparent to-[#FDEBD7]/70" />
      <Footer />
    </div>
  );
}
