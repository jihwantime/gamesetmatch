import Link from "next/link";
import { notFound } from "next/navigation";
import RatingBadge from "@/components/RatingBadge";
import { getHeadToHead, getMatch } from "@/lib/queries";
import { flagEmoji, formatDate, LEVEL_NAMES, pct, ROUND_NAMES } from "@/lib/format";

type M = Record<string, any>; // raw row: the stat columns are wide and dynamic

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const match = (await getMatch(id)) as M | null;
  if (!match) notFound();

  const h2h = await getHeadToHead(match.winner_id, match.loser_id);
  const hasStats = match.w_svpt != null && match.l_svpt != null;
  const minus = (a: number | null, b: number | null) => (a == null || b == null ? null : a - b);

  const rows = hasStats
    ? [
        stat("Aces", match.w_ace, match.l_ace),
        stat("Double faults", match.w_df, match.l_df),
        pctStat("1st serve in", match.w_1st_in, match.w_svpt, match.l_1st_in, match.l_svpt),
        pctStat("1st serve won", match.w_1st_won, match.w_1st_in, match.l_1st_won, match.l_1st_in),
        pctStat("2nd serve won", match.w_2nd_won, minus(match.w_svpt, match.w_1st_in),
                match.l_2nd_won, minus(match.l_svpt, match.l_1st_in)),
        pctStat("Break points saved", match.w_bp_saved, match.w_bp_faced, match.l_bp_saved, match.l_bp_faced),
        stat("Service games", match.w_sv_gms, match.l_sv_gms),
      ]
    : [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="text-center text-[13px] text-fg/45">
        {match.tourney_name}
        {match.tourney_level && <> · {LEVEL_NAMES[match.tourney_level] ?? match.tourney_level}</>}
        {match.surface && <> · {match.surface}</>}
      </div>
      <div className="mt-1 text-center text-[13px] text-fg/35">
        {ROUND_NAMES[match.round] ?? match.round} · {formatDate(match.tourney_date)}
        {match.minutes != null && (
          <> · {Math.floor(match.minutes / 60)}h {match.minutes % 60}m</>
        )}
      </div>

      <div className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-6">
        <PlayerSide id={match.winner_id} name={match.winner_name} ioc={match.winner_ioc}
                    rank={match.winner_rank} rating={match.winner_rating} won />
        <div className="text-center text-[15px] tabular-nums tracking-tight text-fg/80">
          {match.score ?? "—"}
        </div>
        <PlayerSide id={match.loser_id} name={match.loser_name} ioc={match.loser_ioc}
                    rank={match.loser_rank} rating={match.loser_rating} align="right" />
      </div>

      <p className="mt-8 text-center text-[13px] text-fg/42">
        Head to head · {match.winner_name.split(" ").pop()} {h2h.p1_wins}–{h2h.p2_wins}{" "}
        {match.loser_name.split(" ").pop()}
      </p>

      {hasStats ? (
        <section className="mt-14">
          <h2 className="mb-6 text-[11px] uppercase tracking-[0.08em] text-fg/40">Match stats</h2>
          <div className="space-y-5">
            {rows.map((r) => <StatRow key={r.label} {...r} />)}
          </div>
        </section>
      ) : (
        <p className="mt-14 text-center text-[14px] text-fg/40">
          No detailed stats recorded for this match
          {typeof match.score === "string" && match.score.includes("W/O") ? " (walkover)" : ""}.
        </p>
      )}
    </div>
  );
}

function stat(label: string, w: number | null, l: number | null) {
  const max = Math.max(w ?? 0, l ?? 0, 1);
  return { label, w: w?.toString() ?? "—", l: l?.toString() ?? "—",
           wVal: w == null ? null : (w / max) * 100, lVal: l == null ? null : (l / max) * 100 };
}

function pctStat(label: string, wNum: number | null, wDen: number | null, lNum: number | null, lDen: number | null) {
  const w = pct(wNum, wDen);
  const l = pct(lNum, lDen);
  return { label,
    w: w == null ? "—" : `${w.toFixed(0)}%`,
    l: l == null ? "—" : `${l.toFixed(0)}%`,
    wVal: w, lVal: l };
}

// Mirrored bars meeting at a centred label — the winner's side reads brighter.
function StatRow({ label, w, l, wVal, lVal }: {
  label: string; w: string; l: string; wVal: number | null; lVal: number | null;
}) {
  return (
    <div>
      <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-baseline text-[13px]">
        <span className="tabular-nums text-fg/85">{w}</span>
        <span className="text-fg/42">{label}</span>
        <span className="text-right tabular-nums text-fg/85">{l}</span>
      </div>
      <div className="grid grid-cols-2 gap-[3px]">
        <div className="flex h-[3px] justify-end overflow-hidden rounded-l-full bg-fg/[0.06]">
          <div className="rounded-l-full bg-fg/70" style={{ width: `${wVal ?? 0}%` }} />
        </div>
        <div className="flex h-[3px] overflow-hidden rounded-r-full bg-fg/[0.06]">
          <div className="rounded-r-full bg-fg/45" style={{ width: `${lVal ?? 0}%` }} />
        </div>
      </div>
    </div>
  );
}

function PlayerSide({ id, name, ioc, rank, rating, won = false, align = "left" }: {
  id: number; name: string; ioc: string | null; rank: number | null;
  rating: number | null; won?: boolean; align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="text-[11px] uppercase tracking-[0.08em] text-fg/40">
        {won ? "Winner" : "Runner-up"}
      </div>
      <Link
        href={`/player/${id}`}
        className={`mt-1.5 block text-[20px] tracking-tight transition-colors hover:text-fg/70 ${
          won ? "text-fg" : "text-fg/60"
        }`}
      >
        {flagEmoji(ioc)} {name}
      </Link>
      <div className="mt-1 text-[13px] text-fg/40">{rank != null ? `No. ${rank}` : "Unranked"}</div>
      <div className="mt-3"><RatingBadge rating={rating} /></div>
    </div>
  );
}
