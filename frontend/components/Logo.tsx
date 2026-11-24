/**
 * MedVision AI logo: orange medical cross with an ECG pulse line cut through it.
 * Pure inline SVG — no external asset.
 */
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M18 4h12v10h10v12H30v18H18V26H8V14h10z"
        fill="#F97316"
        stroke="#EA580C"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <polyline
        points="10,20 17,20 20,14 24,26 27,20 38,20"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoLockup({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo size={38} />
      <span className={`text-xl font-extrabold tracking-tight ${light ? "text-white" : "text-[#0F1E33]"}`}>
        MedVision <span className="text-[#F97316]">AI</span>
      </span>
    </span>
  );
}
