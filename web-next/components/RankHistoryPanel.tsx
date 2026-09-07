"use client";

import { useState } from "react";
import { formatDate, WIN_COLOR } from "@/lib/format";

type RankPoint = { ranking_date: number; rank: number; points: number | null };

// op.gg-style tier graph: evenly spaced labelled points, monthly / all-time tabs.
export default function RankHistoryPanel({ history }: { history: RankPoint[] }) {
  const [mode, setMode] = useState<"monthly" | "alltime">("monthly");
  if (history.length < 2) {
    return <div className="py-6 text-center text-sm text-slate-500">Not enough ranking data.</div>;
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
    <section className="rounded-3xl bg-card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-white">Rank History</h2>
        <div className="flex gap-1 rounded-full bg-card-2 p-1 text-sm">
          {(["monthly", "alltime"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1 font-semibold ${
                mode === m ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
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
        <line x1={SIDE - 20} x2={W - SIDE + 20} y1={H - BOTTOM + 12} y2={H - BOTTOM + 12} stroke="#ffffff14" />
        <polyline points={line} fill="none" stroke={WIN_COLOR} strokeWidth="2.5" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={p.ranking_date}>
            <circle cx={x(i)} cy={y(p.rank)} r="4.5" fill={WIN_COLOR} stroke="#0b0b0a" strokeWidth="2.5" />
            <text x={x(i)} y={y(p.rank) - 26} textAnchor="middle" className="font-display"
                  fontSize="17" fontWeight="700" fill="#fff">
              #{p.rank}
            </text>
            {p.points != null && (
              <text x={x(i)} y={y(p.rank) - 11} textAnchor="middle" fontSize="10.5" fill="#94a3b8">
                {p.points.toLocaleString()} pts
              </text>
            )}
            <text x={x(i)} y={H - BOTTOM + 30} textAnchor="middle" fontSize="11" fill="#64748b">
              {fmtAxis(p.ranking_date)}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-1 text-center text-[11px] text-slate-600">
        {formatDate(pts[0].ranking_date)} – {formatDate(pts[pts.length - 1].ranking_date)}
      </p>
    </section>
  );
}
