"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SearchIcon from "./SearchIcon";
import { flagEmoji } from "@/lib/format";

type Hit = { id: number; full_name: string; ioc: string | null; total_matches: number };

// No capsule: a magnifier, a caret and a hairline that brightens on focus.
export default function SearchBox() {
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
    <div ref={boxRef} className="relative w-56">
      <div className="flex items-center gap-2 border-b border-fg/[0.18] pb-1.5 transition-colors focus-within:border-fg/50">
        <SearchIcon className="h-[15px] w-[15px] shrink-0 text-fg/42" />
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
          placeholder="Search players"
          aria-label="Search players"
          className="w-full bg-transparent text-[13px] tracking-tight text-fg placeholder:text-fg/42 focus:outline-none"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-fg/12 bg-white/90 shadow-xl backdrop-blur-xl">
          {results.map((p, i) => (
            <li key={p.id}>
              <button
                onMouseDown={(e) => { e.preventDefault(); go(p); }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] tracking-tight transition-colors ${
                  i === active ? "bg-fg/[0.07] text-fg" : "text-fg/65"
                }`}
              >
                <span>{flagEmoji(p.ioc)}</span>
                <span className="flex-1 truncate">{p.full_name}</span>
                <span className="text-[12px] tabular-nums text-fg/40">{p.total_matches}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
