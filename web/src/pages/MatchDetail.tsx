import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type H2H, type MatchDetail as Match } from "../api";
import { ErrorNote, Layout, RatingBadge, Spinner, WIN_COLOR, LOSS_COLOR } from "../components";
import { flagEmoji, formatDate, LEVEL_NAMES, pct, ROUND_NAMES } from "../lib";

export default function MatchDetail() {
  const { id = "" } = useParams();
  const [match, setMatch] = useState<Match | null>(null);
  const [h2h, setH2h] = useState<H2H | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setMatch(null);
    setH2h(null);
    api.match(id).then(setMatch).catch(() => setError("Match not found."));
  }, [id]);

  useEffect(() => {
    if (match) {
      api.h2h(match.winner_id, match.loser_id).then(setH2h).catch(() => {});
    }
  }, [match]);

  if (error) return <Layout><ErrorNote message={error} /></Layout>;
  if (!match) return <Layout><Spinner /></Layout>;

  const hasStats = match.w_svpt != null && match.l_svpt != null;

  // per-side derived stats; "return points won" comes from the opponent's serve line
  const rows: { label: string; w: string; l: string; wVal: number | null; lVal: number | null }[] = hasStats
    ? [
        stat("Aces", match.w_ace, match.l_ace),
        stat("Double faults", match.w_df, match.l_df),
        pctStat("1st serve in", match.w_1stIn, match.w_svpt, match.l_1stIn, match.l_svpt),
        pctStat("1st serve won", match.w_1stWon, match.w_1stIn, match.l_1stWon, match.l_1stIn),
        pctStat(
          "2nd serve won",
          match.w_2ndWon, minus(match.w_svpt, match.w_1stIn),
          match.l_2ndWon, minus(match.l_svpt, match.l_1stIn)
        ),
        pctStat("Break points saved", match.w_bpSaved, match.w_bpFaced, match.l_bpSaved, match.l_bpFaced),
        stat("Service games", match.w_SvGms, match.l_SvGms),
      ]
    : [];

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="text-sm text-slate-400">
            {match.tourney_name}
            {match.tourney_level && <> · {LEVEL_NAMES[match.tourney_level] ?? match.tourney_level}</>}
            {match.surface && <> · <span className="text-sky-400">{match.surface}</span></>}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {ROUND_NAMES[match.round] ?? match.round} · {formatDate(match.tourney_date)}
            {match.minutes != null && <> · 🕐 {Math.floor(match.minutes / 60)}:{String(match.minutes % 60).padStart(2, "0")}</>}
          </div>
        </div>

        {/* scoreboard */}
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-3xl bg-card p-8">
          <PlayerSide
            id={match.winner_id} name={match.winner_name} ioc={match.winner_ioc}
            rank={match.winner_rank} rating={match.winner_rating} won
          />
          <div className="text-center">
            <div className="font-display text-4xl font-bold tabular-nums text-white">{match.score ?? "—"}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">best of {match.best_of}</div>
          </div>
          <PlayerSide
            id={match.loser_id} name={match.loser_name} ioc={match.loser_ioc}
            rank={match.loser_rank} rating={match.loser_rating}
          />
        </div>

        {h2h && (
          <div className="mt-3 text-center text-xs text-slate-500">
            Head-to-head:{" "}
            <span className="text-slate-300">
              {h2h.p1?.full_name} {h2h.p1_wins} – {h2h.p2_wins} {h2h.p2?.full_name}
            </span>
          </div>
        )}

        {/* stat comparison */}
        {hasStats ? (
          <section className="mt-6 rounded-3xl bg-card p-8">
            <h2 className="mb-5 text-center font-display text-2xl font-semibold text-white">Match Stats</h2>
            <div className="space-y-4">
              {rows.map((r) => (
                <StatBarRow key={r.label} {...r} />
              ))}
            </div>
          </section>
        ) : (
          <div className="mt-6 text-center text-sm text-slate-500">
            No detailed stats recorded for this match{match.score?.includes("W/O") ? " (walkover)" : ""}.
          </div>
        )}
      </div>
    </Layout>
  );
}

function minus(a: number | null, b: number | null): number | null {
  return a == null || b == null ? null : a - b;
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

function StatBarRow({ label, w, l, wVal, lVal }: { label: string; w: string; l: string; wVal: number | null; lVal: number | null }) {
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
      <div
        className={`mb-1.5 inline-block rounded-full px-3 py-0.5 font-display text-xs font-bold uppercase tracking-wider ${
          won ? "bg-win text-black" : "bg-loss text-black"
        }`}
      >
        {won ? "Winner" : "Loser"}
      </div>
      <div>
        <Link to={`/player/${id}`} className="font-display text-2xl font-semibold text-white hover:underline">
          {flagEmoji(ioc)} {name}
        </Link>
      </div>
      <div className="mt-1 text-xs text-slate-500">{rank != null ? `Rank #${rank}` : "Unranked"}</div>
      <div className="mt-2"><RatingBadge rating={rating} /></div>
    </div>
  );
}
