import Link from "next/link";
import RatingBadge from "./RatingBadge";
import type { MatchListItem } from "@/lib/queries";
import { flagEmoji, formatDate, LEVEL_CHIP, parseSets } from "@/lib/format";

function SetScores({ m }: { m: MatchListItem }) {
  const sets = parseSets(m.score, m.result === "W");
  if (!sets) return <span className="text-[13px] text-fg/42">{m.score ?? "—"}</span>;
  return (
    <div className="flex items-center gap-2 tabular-nums">
      {sets.map((s, i) => (
        <span key={i} className="text-[14px] leading-none">
          <span className={s.won ? "text-fg" : "text-fg/45"}>{s.mine}</span>
          <span className="text-fg/30">–</span>
          <span className={s.won ? "text-fg/45" : "text-fg/70"}>{s.theirs}</span>
          {s.tb != null && <sup className="ml-px text-[9px] text-fg/40">{s.tb}</sup>}
        </span>
      ))}
      {/RET/.test(m.score ?? "") && (
        <span className="text-[10px] uppercase tracking-wide text-fg/40">ret</span>
      )}
    </div>
  );
}

export default function MatchRow({ m }: { m: MatchListItem }) {
  const win = m.result === "W";
  return (
    <Link
      href={`/match/${m.id}`}
      className="group grid grid-cols-[16px_1fr_auto] items-center gap-4 border-b border-fg/[0.1] py-4 transition-colors hover:border-fg/30 sm:grid-cols-[14px_minmax(150px,190px)_1fr_auto_auto]"
    >
      {/* Result is a small dot plus the W/L letter — colour is never the only cue. */}
      <span
        className={`text-[12px] font-semibold ${win ? "text-win" : "text-loss"}`}
        aria-label={win ? "Win" : "Loss"}
      >
        {win ? "W" : "L"}
      </span>

      <div className="hidden min-w-0 sm:block">
        <div className="truncate text-[14px] tracking-tight text-fg/85">{m.tourney_name}</div>
        <div className="mt-0.5 truncate whitespace-nowrap text-[12px] text-fg/42">
          {formatDate(m.tourney_date)}
          {m.tourney_level && ` · ${LEVEL_CHIP[m.tourney_level] ?? m.tourney_level}`}
        </div>
      </div>

      <div className="min-w-0">
        <div className="truncate text-[15px] tracking-tight text-fg/90 transition-colors group-hover:text-fg">
          {flagEmoji(m.opponent_ioc)} {m.opponent_name}
        </div>
        <div className="mt-0.5 text-[12px] text-fg/42">
          {win ? "def." : "lost to"}
          {m.opponent_rank != null && ` · #${m.opponent_rank}`}
          <span className="sm:hidden"> · {m.round}</span>
        </div>
      </div>

      <div className="hidden justify-self-end sm:block">
        <SetScores m={m} />
      </div>

      <div className="w-10 justify-self-end text-right">
        <RatingBadge rating={m.rating} />
      </div>
    </Link>
  );
}
