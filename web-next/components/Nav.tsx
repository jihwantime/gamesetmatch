"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/leaderboard", label: "Rankings" },
  { href: "/predict", label: "Match Prediction" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <>
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative py-1 text-sm font-semibold tracking-wide transition ${
              active ? "text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.label}
            {active && (
              <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-win" />
            )}
          </Link>
        );
      })}
    </>
  );
}
