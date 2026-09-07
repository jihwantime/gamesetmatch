"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SearchIcon from "./SearchIcon";
import { flagEmoji } from "@/lib/format";

type Pick = { id: number; full_name: string; ioc: string | null };

export default function PredictorControls({
  surfaces, surface, p1, p2,
}: {
  surfaces: string[]; surface: string; p1: Pick | null; p2: Pick | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next}`);
  };

  return (
    <>
      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <PlayerPicker selected={p1} onSelect={(p) => setParam("p1", p ? String(p.id) : "")} />
        <span className="text-[13px] uppercase tracking-[0.1em] text-white/25">vs</span>
        <PlayerPicker selected={p2} onSelect={(p) => setParam("p2", p ? String(p.id) : "")} />
      </div>
      <div className="mx-auto mt-8 flex w-fit gap-8 border-b border-white/[0.1]">
        {surfaces.map((s) => (
          <button
            key={s}
            onClick={() => setParam("surface", s)}
            className={`relative -mb-px border-b pb-2.5 text-[14px] tracking-tight transition-colors ${
              surface === s
                ? "border-white text-white"
                : "border-transparent text-white/40 hover:text-white/80"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </>
  );
}

function PlayerPicker({
  selected, onSelect,
}: {
  selected: Pick | null; onSelect: (p: Pick | null) => void;
}) {
  const [q, setQ] = useState(selected?.full_name ?? "");
  const [results, setResults] = useState<Pick[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQ(selected?.full_name ?? "");
  }, [selected?.id, selected?.full_name]);

  useEffect(() => {
    if (selected && q === selected.full_name) return setResults([]);
    if (q.trim().length < 2) return setResults([]);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((r) => { setResults(r.players); setOpen(true); })
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q, selected]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <div
        className="flex items-center gap-2.5 border-b border-white/[0.16] pb-2 transition-colors focus-within:border-white/45"
      >
        {selected ? (
          <span className="text-[17px]">{flagEmoji(selected.ioc)}</span>
        ) : (
          <SearchIcon className="h-4 w-4 shrink-0 text-white/35" />
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search a player…"
          className="w-full bg-transparent text-[17px] tracking-tight text-white placeholder:text-[15px] placeholder:text-white/35 focus:outline-none"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#131316]/95 shadow-2xl backdrop-blur-xl">
          {results.map((p) => (
            <li key={p.id}>
              <button
                onMouseDown={(e) => { e.preventDefault(); setOpen(false); onSelect(p); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] tracking-tight text-white/70 transition-colors hover:bg-white/[0.07] hover:text-white"
              >
                <span>{flagEmoji(p.ioc)}</span>
                <span className="flex-1">{p.full_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
