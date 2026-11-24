"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { LogoLockup } from "./Logo";

const nav = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "About", href: "/#about" },
  { label: "History", href: "/history" },
  { label: "Models", href: "/models" },
  { label: "Contact", href: "/#contact" },
];

/**
 * Shared TOP navigation for every MedVision AI page.
 * There is intentionally NO sidebar / side panel anywhere in the app —
 * navigation stays at the top (logo left, nav centre, action right).
 */
export default function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <Link href="/" aria-label="MedVision AI home">
          <LogoLockup />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[#F97316] text-white shadow-[0_8px_20px_-8px_rgba(249,115,22,0.8)]"
                    : "text-[#0F1E33] hover:text-[#F97316]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/#try"
          className="flex items-center gap-2 rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(249,115,22,0.9)] transition hover:bg-[#EA580C]"
        >
          Try Demo <ArrowRight size={16} />
        </Link>
      </div>
      {/* Mobile top nav row (still top navigation — no sidebar) */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-orange-50 px-4 py-2 lg:hidden">
        {nav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${
              pathname === item.href ? "bg-[#F97316] text-white" : "text-[#0F1E33] hover:text-[#F97316]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
