"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { addToHistory, readFileAsDataUrl, setLastFile, type HistoryEntry } from "@/lib/history";

/**
 * Drag & drop / click-to-browse upload zone.
 * The chosen image is sent to the REAL FastAPI backend
 * (POST /api/v1/analyze). The verbatim response is stored in the
 * browser history and the user is taken to its result view.
 * The backend only accepts PNG / JPEG, up to 10 MB.
 */
export default function UploadZone({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("Please choose a PNG or JPEG image — the analysis backend accepts those formats only.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be 10 MB or smaller.");
      return;
    }
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const [result, imageDataUrl] = await Promise.all([api.analyze(file), readFileAsDataUrl(file)]);
      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        fileName: file.name,
        createdAt: new Date().toISOString(),
        result,
        imageDataUrl,
      };
      addToHistory(entry);
      setLastFile(file);
      router.push(`/result?id=${encodeURIComponent(entry.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a chest X-ray image"
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !busy) void handleFile(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition ${
          compact ? "py-8" : "py-12"
        } ${dragOver ? "border-[#F97316] bg-[#FFF3E8]" : "border-[#F97316]/50 bg-[#FFF8F1] hover:border-[#F97316]"}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected X-ray preview" className="mb-4 max-h-44 rounded-xl object-contain shadow" />
        ) : (
          <CloudUpload size={52} className="text-[#F97316]" strokeWidth={1.6} />
        )}
        <p className="mt-2 text-base font-bold text-[#0F1E33]">
          {busy ? "Analyzing your X-ray…" : (fileName ?? "Drag & Drop your X-Ray here")}
        </p>
        <p className="mt-1 text-sm text-[#0F1E33]/60">or click to browse — PNG or JPEG, up to 10 MB</p>
        {busy && <Loader2 className="mt-3 animate-spin text-[#F97316]" size={22} />}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
