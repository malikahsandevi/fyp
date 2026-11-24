/**
 * CSS/SVG chest X-ray placeholder visual.
 * A dark rounded panel with a stylised ribcage / spine / lung SVG drawn in
 * light greys — generated in code, no external or copyrighted X-ray photo.
 */
export default function XrayVisual({ className = "", small = false }: { className?: string; small?: boolean }) {
  const ribs = [0, 1, 2, 3, 4, 5];
  return (
    <div className={`relative overflow-hidden bg-[#0b0e13] ${className}`} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="xg" cx="50%" cy="38%" r="75%">
            <stop offset="0%" stopColor="#3a4150" />
            <stop offset="55%" stopColor="#171b23" />
            <stop offset="100%" stopColor="#05070a" />
          </radialGradient>
        </defs>
        <rect width="200" height="200" fill="url(#xg)" />
        {/* clavicles */}
        <path d="M100 28 C 78 22, 58 26, 44 36" stroke="#c9ced6" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85" />
        <path d="M100 28 C 122 22, 142 26, 156 36" stroke="#c9ced6" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85" />
        {/* spine */}
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x="94" y={34 + i * 17} width="12" height="11" rx="3" fill="#d6dae1" opacity={0.9 - i * 0.04} />
        ))}
        {/* ribs */}
        {ribs.map((i) => (
          <g key={i} opacity={0.75 - i * 0.06}>
            <path d={`M97 ${52 + i * 18} C 70 ${46 + i * 18}, 48 ${58 + i * 17}, 40 ${78 + i * 15}`} stroke="#aeb5c0" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <path d={`M103 ${52 + i * 18} C 130 ${46 + i * 18}, 152 ${58 + i * 17}, 160 ${78 + i * 15}`} stroke="#aeb5c0" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          </g>
        ))}
        {/* lung fields */}
        <ellipse cx="68" cy="105" rx="30" ry="52" fill="#000" opacity="0.45" />
        <ellipse cx="132" cy="105" rx="30" ry="52" fill="#000" opacity="0.45" />
        {/* heart shadow */}
        <ellipse cx="104" cy="142" rx="24" ry="28" fill="#8f97a3" opacity="0.35" />
        {/* diaphragm */}
        <path d="M38 178 C 70 162, 92 170, 100 178 C 108 170, 130 162, 162 178" stroke="#c9ced6" strokeWidth="4" fill="none" opacity="0.7" />
      </svg>
      {!small && (
        <span className="absolute bottom-2 right-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
          Chest X-Ray
        </span>
      )}
    </div>
  );
}
