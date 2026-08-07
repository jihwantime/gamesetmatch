import Link from "next/link";
import RatingBadge from "./RatingBadge";
import type { MatchListItem } from "@/lib/queries";
import { flagEmoji, formatDate, LEVEL_CHIP, parseSets } from "@/lib/format";

function SetScores({ m }: { m: MatchListItem }) {
  const sets = parseSets(m.score, m.result === "W");
  if (!sets) return <span className="text-xs text-slate-500">{m.score ?? "—"}</span>;
  const accent = m.result === "W" ? "text-win" : "text-loss";
  return (
    <div className="flex items-center gap-1.5">
      {sets.map((s, i) => (
        <div
          key={i}
          className="flex w-7 flex-col items-center rounded-lg bg-card-2 py-1 font-display text-base font-semibold leading-tight"
        >
          <span className={s.won ? accent : "text-slate-200"}>
            {s.mine}
            {s.tb != null && !s.won && <sup className="text-[9px] text-slate-500">{s.tb}</sup>}
          </span>
          <span className="text-slate-400">
            {s.theirs}
            {s.tb != null && s.won && <sup className="text-[9px] text-slate-500">{s.tb}</sup>}
          </span>
        </div>
      ))}
      {/RET/.test(m.score ?? "") && <span className="ml-1 text-[10px] uppercase text-slate-500">ret</span>}
    </div>
  );
}

export default function MatchRow({ m }: { m: MatchListItem }) {
  const win = m.result === "W";
  return (
    <Link
      href={`/match/${m.id}`}
      className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-card px-4 py-3.5 pl-5 transition hover:bg-card-2"
    >
      <span className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${win ? "bg-win" : "bg-loss"}`} />
      <div className="w-20 shrink-0">
        <span
          className={`inline-block rounded-full px-3 py-1 font-display text-sm font-bold ${
            win ? "bg-win text-black" : "bg-loss text-black"
          }`}
        >
          {win ? "Win" : "Loss"}
        </span>
        <div className="mt-1.5 text-[11px] text-slate-500">{formatDate(m.tourney_date)}</div>
      </div>
      <div className="w-40 shrink-0">
        <div className="flex items-center gap-2 text-[11px]">
          {m.tourney_level && (
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-medium text-slate-400">
              {LEVEL_CHIP[m.tourney_level] ?? m.tourney_level}
            </span>
          )}
          {m.surface && <span className="font-medium text-sky-400">{m.surface}</span>}
        </div>
        <div className="mt-1 truncate font-display text-lg font-semibold leading-tight text-white">
          {m.tourney_name}
        </div>
        <div className="text-[11px] text-slate-500">{m.round}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-slate-500">{win ? "defeated" : "lost to"}</div>
        <div className="truncate font-display text-lg font-semibold leading-tight text-white">
          {flagEmoji(m.opponent_ioc)} {m.opponent_name}
        </div>
        <div className="text-[11px] text-slate-500">
          {m.opponent_rank != null ? `#${m.opponent_rank}` : "unranked"}
          {m.opponent_ioc && ` · ${m.opponent_ioc}`}
        </div>
      </div>
      <div className="hidden sm:block">
        <SetScores m={m} />
      </div>
      {m.minutes != null && (
        <span className="hidden w-12 text-right text-xs tabular-nums text-slate-500 md:block">
          🕐 {Math.floor(m.minutes / 60)}:{String(m.minutes % 60).padStart(2, "0")}
        </span>
      )}
      <RatingBadge rating={m.rating} />
    </Link>
  );
}
