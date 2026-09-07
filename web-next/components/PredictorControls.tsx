"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { flagEmoji, LOSS_COLOR, WIN_COLOR } from "@/lib/format";

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
        <PlayerPicker selected={p1} accent={WIN_COLOR} onSelect={(p) => setParam("p1", p ? String(p.id) : "")} />
        <span className="font-display text-2xl font-bold text-slate-600">vs</span>
        <PlayerPicker selected={p2} accent={LOSS_COLOR} onSelect={(p) => setParam("p2", p ? String(p.id) : "")} />
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {surfaces.map((s) => (
          <button
            key={s}
            onClick={() => setParam("surface", s)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              surface === s ? "bg-win text-black" : "bg-card text-slate-300 hover:bg-card-2"
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
  selected, onSelect, accent,
}: {
  selected: Pick | null; onSelect: (p: Pick | null) => void; accent: string;
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
        className={`flex items-center gap-2 rounded-2xl bg-card px-4 py-3 ${selected ? "" : "border border-white/10"}`}
        style={selected ? { boxShadow: `inset 0 0 0 2px ${accent}` } : undefined}
      >
        {selected && <span className="text-2xl">{flagEmoji(selected.ioc)}</span>}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search a player…"
          className="w-full bg-transparent text-center font-display text-xl font-semibold text-white placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-slate-500 focus:outline-none"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl">
          {results.map((p) => (
            <li key={p.id}>
              <button
                onMouseDown={(e) => { e.preventDefault(); setOpen(false); onSelect(p); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-300 hover:bg-card-2"
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
