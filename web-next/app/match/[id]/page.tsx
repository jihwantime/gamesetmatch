import Link from "next/link";
import { notFound } from "next/navigation";
import RatingBadge from "@/components/RatingBadge";
import { getHeadToHead, getMatch } from "@/lib/queries";
import { flagEmoji, formatDate, LEVEL_NAMES, LOSS_COLOR, pct, ROUND_NAMES, WIN_COLOR } from "@/lib/format";

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
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <div className="text-sm text-slate-400">
          {match.tourney_name}
          {match.tourney_level && <> · {LEVEL_NAMES[match.tourney_level] ?? match.tourney_level}</>}
          {match.surface && <> · <span className="text-sky-400">{match.surface}</span></>}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {ROUND_NAMES[match.round] ?? match.round} · {formatDate(match.tourney_date)}
          {match.minutes != null && (
            <> · 🕐 {Math.floor(match.minutes / 60)}:{String(match.minutes % 60).padStart(2, "0")}</>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-3xl bg-card p-8">
        <PlayerSide id={match.winner_id} name={match.winner_name} ioc={match.winner_ioc}
                    rank={match.winner_rank} rating={match.winner_rating} won />
        <div className="text-center">
          <div className="font-display text-4xl font-bold tabular-nums text-white">{match.score ?? "—"}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">best of {match.best_of}</div>
        </div>
        <PlayerSide id={match.loser_id} name={match.loser_name} ioc={match.loser_ioc}
                    rank={match.loser_rank} rating={match.loser_rating} />
      </div>

      <div className="mt-3 text-center text-xs text-slate-500">
        Head-to-head:{" "}
        <span className="text-slate-300">
          {match.winner_name} {h2h.p1_wins} – {h2h.p2_wins} {match.loser_name}
        </span>
      </div>

      {hasStats ? (
        <section className="mt-6 rounded-3xl bg-card p-8">
          <h2 className="mb-5 text-center font-display text-2xl font-semibold text-white">Match Stats</h2>
          <div className="space-y-4">
            {rows.map((r) => <StatBarRow key={r.label} {...r} />)}
          </div>
        </section>
      ) : (
        <div className="mt-6 text-center text-sm text-slate-500">
          No detailed stats recorded for this match
          {typeof match.score === "string" && match.score.includes("W/O") ? " (walkover)" : ""}.
        </div>
      )}
    </div>
  );
}

function stat(label: string, w: number | null, l: number | null) {
  const max = Math.max(w ?? 0, l ?? 0, 1);
  return {
    label,
    w: w?.toString() ?? "—",
    l: l?.toString() ?? "—",
    wVal: w == null ? null : (w / max) * 100,
    lVal: l == null ? null : (l / max) * 100,
  };
}

function pctStat(label: string, wNum: number | null, wDen: number | null, lNum: number | null, lDen: number | null) {
  const w = pct(wNum, wDen);
  const l = pct(lNum, lDen);
  return {
    label,
    w: w == null ? "—" : `${w.toFixed(0)}% (${wNum}/${wDen})`,
    l: l == null ? "—" : `${l.toFixed(0)}% (${lNum}/${lDen})`,
    wVal: w,
    lVal: l,
  };
}

function StatBarRow({ label, w, l, wVal, lVal }: {
  label: string; w: string; l: string; wVal: number | null; lVal: number | null;
}) {
  return (
    <div>
      <div className="mb-1 grid grid-cols-[1fr_auto_1fr] text-xs">
        <span className="tabular-nums text-slate-200">{w}</span>
        <span className="text-slate-500">{label}</span>
        <span className="text-right tabular-nums text-slate-200">{l}</span>
      </div>
      <div className="grid grid-cols-2 gap-[2px]">
        <div className="flex h-2 justify-end overflow-hidden rounded-l-full bg-white/5">
          <div style={{ width: `${wVal ?? 0}%`, background: WIN_COLOR }} className="rounded-l-full" />
        </div>
        <div className="flex h-2 overflow-hidden rounded-r-full bg-white/5">
          <div style={{ width: `${lVal ?? 0}%`, background: LOSS_COLOR }} className="rounded-r-full" />
        </div>
      </div>
    </div>
  );
}

function PlayerSide({ id, name, ioc, rank, rating, won = false }: {
  id: number; name: string; ioc: string | null; rank: number | null; rating: number | null; won?: boolean;
}) {
  return (
    <div className="text-center">
      <div className={`mb-1.5 inline-block rounded-full px-3 py-0.5 font-display text-xs font-bold uppercase tracking-wider ${
        won ? "bg-win text-black" : "bg-loss text-black"
      }`}>
        {won ? "Winner" : "Loser"}
      </div>
      <div>
        <Link href={`/player/${id}`} className="font-display text-2xl font-semibold text-white hover:underline">
          {flagEmoji(ioc)} {name}
        </Link>
      </div>
      <div className="mt-1 text-xs text-slate-500">{rank != null ? `Rank #${rank}` : "Unranked"}</div>
      <div className="mt-2"><RatingBadge rating={rating} /></div>
    </div>
  );
}
