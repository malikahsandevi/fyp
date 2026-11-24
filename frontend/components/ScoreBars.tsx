import { humanize, type Prediction } from "@/lib/api";

/**
 * All model scores as clickable bars — behaviour adapted from the
 * original MedVision frontend (tick = per-class decision threshold,
 * clicking a row retargets the Grad-CAM viewer).
 */
export default function ScoreBars({
  predictions,
  selected,
  onSelect,
}: {
  predictions: Prediction[];
  selected: string;
  onSelect: (label: string) => void;
}) {
  return (
    <ul className="space-y-1.5">
      {predictions.map((p) => (
        <li key={p.label}>
          <button
            onClick={() => onSelect(p.label)}
            className={`group w-full rounded-xl px-3 py-2 text-left transition ${
              selected === p.label ? "bg-[#FFF3E8]" : "hover:bg-[#FFF8F1]"
            }`}
          >
            <div className="flex justify-between text-sm">
              <span className={p.flagged ? "font-bold text-[#0F1E33]" : "font-medium text-[#0F1E33]/65"}>
                {humanize(p.label)}
                {p.flagged && (
                  <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">Flagged</span>
                )}
              </span>
              <span className="font-semibold tabular-nums text-[#0F1E33]/70">{(p.score * 100).toFixed(1)}%</span>
            </div>
            <div className="relative mt-1.5 h-2 rounded-full bg-black/5">
              <div
                className={`h-2 rounded-full ${p.flagged ? "bg-red-400" : "bg-[#F97316]"}`}
                style={{ width: `${Math.min(p.score, 1) * 100}%` }}
              />
              <div
                className="absolute top-[-2px] h-3 w-px bg-[#16283F]/70"
                style={{ left: `${p.threshold * 100}%` }}
                title={`threshold ${p.threshold}`}
              />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
