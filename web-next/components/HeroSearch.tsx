"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SearchIcon from "./SearchIcon";
import { flagEmoji } from "@/lib/format";

type Hit = { id: number; full_name: string; ioc: string | null; total_matches: number };

// Chromeless over the photography: icon, caret, and a single hairline.
export default function HeroSearch() {
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
        .then((r) => { setResults(r.players); setOpen(true); setActive(0); })
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
    <div ref={boxRef} className="relative mx-auto w-full max-w-md text-left">
      <div className="flex items-center gap-3 border-b border-white/25 pb-3 transition-colors focus-within:border-white/60">
        <SearchIcon className="h-[19px] w-[19px] shrink-0 text-white/55" />
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
          placeholder="Search a player"
          aria-label="Search players"
          className="w-full bg-transparent text-[19px] tracking-tight text-white placeholder:text-white/50 focus:outline-none"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-3 w-full overflow-hidden rounded-xl border border-white/10 bg-black/70 shadow-2xl backdrop-blur-2xl">
          {results.map((p, i) => (
            <li key={p.id}>
              <button
                onMouseDown={(e) => { e.preventDefault(); go(p); }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] tracking-tight transition-colors ${
                  i === active ? "bg-white/10 text-white" : "text-white/70"
                }`}
              >
                <span>{flagEmoji(p.ioc)}</span>
                <span className="flex-1 truncate">{p.full_name}</span>
                <span className="text-[12px] tabular-nums text-white/30">{p.total_matches}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
