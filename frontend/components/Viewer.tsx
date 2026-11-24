"use client";
import { useEffect, useRef, useState } from "react";
import { api, humanize } from "@/lib/api";

/**
 * X-ray viewer with Grad-CAM overlay — behaviour adapted from the
 * original MedVision frontend: fetches POST /api/v1/gradcam?label=
 * for the selected class and toggles between heatmap and original.
 */
export default function Viewer({ file, previewUrl, label }: { file: File; previewUrl: string; label: string }) {
  const [heatUrl, setHeatUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"original" | "heatmap">("heatmap");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!label) return;
    const ctrl = new AbortController();
    setState("loading");
    setError("");
    api
      .gradcam(file, label, ctrl.signal)
      .then((url) => {
        if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
        lastUrl.current = url;
        setHeatUrl(url);
        setState("idle");
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setHeatUrl(null);
        setError(e.message);
        setState("error");
      });
    return () => ctrl.abort();
  }, [file, label]);

  useEffect(
    () => () => {
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    },
    []
  );

  const showHeat = mode === "heatmap" && heatUrl;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-orange-200 bg-white p-0.5 text-sm font-semibold">
          {(["heatmap", "original"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 capitalize transition ${mode === m ? "bg-[#16283F] text-white" : "text-[#0F1E33]/60"}`}
            >
              {m === "heatmap" ? "Grad-CAM" : "Original"}
            </button>
          ))}
        </div>
        <span className="text-xs text-[#0F1E33]/55">
          Target: <b className="text-[#0F1E33]">{humanize(label)}</b>
        </span>
      </div>
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={showHeat ? heatUrl! : previewUrl} alt="Chest X-ray" className="h-full w-full object-contain" />
        {state === "loading" && mode === "heatmap" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
            Generating heatmap…
          </div>
        )}
      </div>
      {state === "error" && <p className="mt-2 text-xs font-medium text-red-600">Heatmap unavailable: {error}</p>}
      <p className="mt-2 text-xs text-[#0F1E33]/55">
        Grad-CAM shows where the model looked for this class. It is an explanation of the model, not a verified location of disease.
      </p>
    </div>
  );
}
