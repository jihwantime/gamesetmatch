"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";

type RankPoint = { ranking_date: number; rank: number; points: number | null };

// op.gg-style tier graph: evenly spaced labelled points, monthly / all-time tabs.
export default function RankHistoryPanel({ history }: { history: RankPoint[] }) {
  const [mode, setMode] = useState<"monthly" | "alltime">("monthly");
  if (history.length < 2) {
    return <div className="py-6 text-center text-[14px] text-fg/40">Not enough ranking data.</div>;
  }

  let pts: RankPoint[];
  if (mode === "monthly") {
    const byMonth = new Map<number, RankPoint>();
    for (const p of history) byMonth.set(Math.floor(p.ranking_date / 100), p);
    pts = [...byMonth.values()].slice(-12);
  } else {
    const n = Math.min(12, history.length);
    const idx = new Set<number>();
    for (let i = 0; i < n; i++) idx.add(Math.round((i * (history.length - 1)) / (n - 1)));
    pts = [...idx].sort((a, b) => a - b).map((i) => history[i]);
  }

  const W = 960, H = 250, TOP = 64, BOTTOM = 36, SIDE = 50;
  const minRank = Math.min(...pts.map((p) => p.rank));
  const maxRank = Math.max(...pts.map((p) => p.rank));
  const x = (i: number) => (pts.length === 1 ? W / 2 : SIDE + (i * (W - 2 * SIDE)) / (pts.length - 1));
  const y = (r: number) =>
    maxRank === minRank ? (TOP + H - BOTTOM) / 2 : TOP + ((r - minRank) / (maxRank - minRank)) * (H - TOP - BOTTOM);
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.rank).toFixed(1)}`).join(" ");

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtAxis = (d: number) =>
    mode === "monthly"
      ? `${String(Math.floor((d % 10000) / 100)).padStart(2, "0")}/${String(d % 100).padStart(2, "0")}`
      : `${MONTHS[Math.floor((d % 10000) / 100) - 1]} '${String(Math.floor(d / 10000) % 100).padStart(2, "0")}`;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.08em] text-fg/40">Ranking history</h2>
        <div className="flex gap-5">
          {(["monthly", "alltime"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`border-b pb-1 text-[13px] tracking-tight transition-colors ${
                mode === m ? "border-fg text-fg" : "border-transparent text-fg/45 hover:text-fg/80"
              }`}
            >
              {m === "monthly" ? "Monthly" : "All time"}
            </button>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Ranking history, best rank ${minRank}`}
      >
        <line x1={SIDE - 20} x2={W - SIDE + 20} y1={H - BOTTOM + 12} y2={H - BOTTOM + 12} stroke="rgba(0,0,0,0.12)" />
        <polyline points={line} fill="none" stroke="rgba(29,29,31,0.85)" strokeWidth="2.5" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={p.ranking_date}>
            <circle cx={x(i)} cy={y(p.rank)} r="4.5" fill="#1d1d1f" stroke="#fbfbfd" strokeWidth="2.5" />
            <text x={x(i)} y={y(p.rank) - 26} textAnchor="middle" fontSize="15" fontWeight="600" fill="#1d1d1f">
              #{p.rank}
            </text>
            {p.points != null && (
              <text x={x(i)} y={y(p.rank) - 11} textAnchor="middle" fontSize="10.5" fill="rgba(0,0,0,0.5)">
                {p.points.toLocaleString()} pts
              </text>
            )}
            <text x={x(i)} y={H - BOTTOM + 30} textAnchor="middle" fontSize="11" fill="rgba(0,0,0,0.4)">
              {fmtAxis(p.ranking_date)}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-2 text-center text-[11px] text-fg/35">
        {formatDate(pts[0].ranking_date)} – {formatDate(pts[pts.length - 1].ranking_date)}
      </p>
    </section>
  );
}
