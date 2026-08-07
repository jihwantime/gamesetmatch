"use client";

import { useState } from "react";
import RankHistoryPanel from "./RankHistoryPanel";

type RankPoint = { ranking_date: number; rank: number; points: number | null };

export default function RankHistoryToggle({ history }: { history: RankPoint[] }) {
  const [open, setOpen] = useState(false);
  if (history.length < 2) return null;
  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((s) => !s)}
        className={`rounded-full px-5 py-2 font-display text-base font-semibold transition ${
          open ? "bg-win text-black" : "bg-card text-slate-300 hover:bg-card-2 hover:text-white"
        }`}
      >
        Rank History {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="mt-3">
          <RankHistoryPanel history={history} />
        </div>
      )}
    </div>
  );
}
