"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { flagEmoji } from "@/lib/format";

type Hit = { id: number; full_name: string; ioc: string | null; total_matches: number };

export default function SearchBox({ large = false }: { large?: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((r) => {
          setResults(r.players);
          setOpen(true);
          setActive(0);
        })
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (p: Hit) => {
    setOpen(false);
    setQ("");
    router.push(`/player/${p.id}`);
  };

  return (
    <div ref={boxRef} className={`relative ${large ? "w-full max-w-xl" : "w-64"}`}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || results.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
          if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search a player…"
        aria-label="Search players"
        className={`w-full rounded-full bg-white/[0.06] tracking-tight text-white transition-colors placeholder:text-white/35 hover:bg-white/[0.09] focus:bg-white/[0.11] focus:outline-none ${
          large ? "px-6 py-3.5 text-center text-[16px]" : "px-4 py-1.5 text-[13px]"
        }`}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#131316]/95 shadow-2xl backdrop-blur-xl">
          {results.map((p, i) => (
            <li key={p.id}>
              <button
                onMouseDown={(e) => { e.preventDefault(); go(p); }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] tracking-tight transition-colors ${
                  i === active ? "bg-white/[0.08] text-white" : "text-white/65"
                }`}
              >
                <span>{flagEmoji(p.ioc)}</span>
                <span className="flex-1">{p.full_name}</span>
                <span className="text-[12px] tabular-nums text-white/30">{p.total_matches}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
