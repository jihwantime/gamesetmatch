"use client";

import { useState } from "react";
import RankHistoryPanel from "./RankHistoryPanel";

type RankPoint = { ranking_date: number; rank: number; points: number | null };

export default function RankHistoryToggle({ history }: { history: RankPoint[] }) {
  const [open, setOpen] = useState(false);
  if (history.length < 2) return null;
  return (
    <div className="mt-10">
      <button
        onClick={() => setOpen((s) => !s)}
        className="text-[14px] tracking-tight text-white/45 transition-colors hover:text-white"
      >
        {open ? "Hide ranking history" : "Ranking history"} <span className="text-white/30">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="mt-6">
          <RankHistoryPanel history={history} />
        </div>
      )}
    </div>
  );
}
