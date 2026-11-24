"use client";
import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { api, type ModelInfo, type ModelVersion } from "@/lib/api";

/**
 * Models & Knowledge page — functionality from the original MedVision
 * frontend (model registry activate/reload, knowledge re-index),
 * restyled to the new design with top navigation.
 */
export default function ModelsPage() {
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [registry, setRegistry] = useState("");
  const [kb, setKb] = useState<{ chunks: number; documents: number; embedder: string | null } | null>(null);
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [i, l, k] = await Promise.all([api.modelInfo(), api.listModels(), api.knowledge()]);
      setInfo(i);
      setVersions(l.versions);
      setRegistry(l.registry_dir);
      setKb(k);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  async function act(key: string, fn: () => Promise<unknown>, okText: string) {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: okText });
      await refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy("");
    }
  }

  const btn =
    "rounded-full border border-[#F97316] px-4 py-2 text-sm font-bold text-[#0F1E33] transition hover:bg-[#FFF3E8] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      <Header />
      <main className="mx-auto max-w-7xl space-y-6 px-5 py-8 lg:px-8">
        <section className="card p-7">
          <h1 className="text-3xl font-extrabold">Models &amp; Knowledge</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#0F1E33]/65">
            Models live in the registry folder outside the backend code. Add a new version folder, then
            activate it here without restarting.
          </p>
          {info && (
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-4">
              {[
                { dt: "Active version", dd: info.model_version },
                { dt: "Architecture", dd: info.architecture },
                { dt: "Classes", dd: String(info.num_classes) },
                { dt: "Device / Grad-CAM", dd: `${info.device} / ${info.gradcam_supported ? "yes" : "no"}` },
              ].map(({ dt, dd }) => (
                <div key={dt} className="rounded-2xl bg-[#F7F9FC] p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[#0F1E33]/50">{dt}</dt>
                  <dd className="mt-1 font-bold">{dd}</dd>
                </div>
              ))}
            </dl>
          )}
          <label className="mt-5 block text-xs font-semibold text-[#0F1E33]/55">
            Admin token (only if the backend sets ADMIN_TOKEN)
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-1.5 w-full max-w-xs rounded-xl border border-black/10 px-3.5 py-2 text-sm outline-none focus:border-[#F97316]"
          />
          {msg && (
            <p className={`mt-4 rounded-xl px-4 py-2.5 text-sm font-medium ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {msg.text}
            </p>
          )}
        </section>

        <section className="card p-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#0F1E33]/50">Registry Versions</h2>
            <button
              className={btn}
              disabled={!!busy}
              onClick={() => act("reload", () => api.reloadModel(token || undefined), "Active model reloaded from disk.")}
            >
              {busy === "reload" ? "Reloading…" : "Reload active"}
            </button>
          </div>
          <p className="mb-3 break-all text-xs text-[#0F1E33]/45">{registry}</p>
          <ul className="divide-y divide-black/5">
            {versions.map((v) => (
              <li key={v.version} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <span className="font-bold">{v.version}</span>
                  <span className="ml-2 text-sm text-[#0F1E33]/55">
                    {v.architecture ?? "unknown arch"}
                    {v.description ? ` · ${v.description}` : ""}
                  </span>
                  {v.active && (
                    <span className="ml-2 rounded-full bg-[#FFF3E8] px-2.5 py-0.5 text-xs font-bold text-[#EA580C]">active</span>
                  )}
                </div>
                <button
                  className={btn}
                  disabled={!!busy || v.active}
                  onClick={() => act(v.version, () => api.activate(v.version, token || undefined), `Switched to ${v.version}.`)}
                >
                  {busy === v.version ? "Loading…" : "Activate"}
                </button>
              </li>
            ))}
            {versions.length === 0 && <li className="py-3 text-sm text-[#0F1E33]/55">No versions found.</li>}
          </ul>
        </section>

        <section className="card flex flex-wrap items-center justify-between gap-4 p-7">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#0F1E33]/50">Knowledge Base</h2>
            {kb && (
              <p className="mt-1.5 text-sm text-[#0F1E33]/75">
                {kb.documents} documents · {kb.chunks} chunks · embedder: {kb.embedder}
              </p>
            )}
          </div>
          <button
            className={btn}
            disabled={!!busy}
            onClick={() => act("kb", () => api.reloadKnowledge(token || undefined), "Knowledge base re-indexed.")}
          >
            {busy === "kb" ? "Indexing…" : "Re-index"}
          </button>
        </section>
      </main>
      <Footer />
    </div>
  );
}
