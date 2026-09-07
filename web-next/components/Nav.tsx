"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/leaderboard", label: "Rankings" },
  { href: "/predict", label: "Match Prediction" },
];

export default function Nav({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-7">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`font-sf text-[15px] tracking-tight transition-colors ${
              active
                ? "text-white"
                : overlay
                  ? "text-white/70 hover:text-white"
                  : "text-white/50 hover:text-white/90"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
