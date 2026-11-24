import Link from "next/link";
import { Github, Linkedin, Youtube } from "lucide-react";
import { LogoLockup } from "./Logo";

const links = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "About", href: "/#about" },
  { label: "History", href: "/history" },
  { label: "Models", href: "/models" },
  { label: "Contact", href: "/#contact" },
];

export default function Footer() {
  return (
    <footer id="contact" className="bg-[#16283F] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-8 px-5 py-10 lg:px-8">
        <div>
          <LogoLockup light />
          <p className="mt-2 text-sm text-white/70">Smarter Diagnosis. Healthier Tomorrow.</p>
        </div>
        <nav className="mx-auto flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
          {links.map((l, i) => (
            <span key={l.label} className="flex items-center gap-5">
              {i > 0 && <span className="text-white/25">|</span>}
              <Link href={l.href} className="hover:text-[#F97316]">
                {l.label}
              </Link>
            </span>
          ))}
        </nav>
        <div className="flex gap-3">
          {[
            { label: "GitHub", Icon: Github },
            { label: "YouTube", Icon: Youtube },
            { label: "LinkedIn", Icon: Linkedin },
          ].map(({ label, Icon }) => (
            <a
              key={label}
              href="#"
              aria-label={label}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-[#F97316]"
            >
              <Icon size={17} />
            </a>
          ))}
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-white/60">
        © 2026 MedVision AI. All Rights Reserved.
      </p>
    </footer>
  );
}
