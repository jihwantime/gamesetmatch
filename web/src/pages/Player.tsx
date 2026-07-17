import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type MatchPage, type Profile, type RankPoint } from "../api";
import { ErrorNote, Layout, MatchRow, RankSparkline, RatingBadge, Spinner, WinLossBar } from "../components";
import { ageFromDob, flagEmoji, formatDate } from "../lib";

const SURFACES = ["Hard", "Clay", "Grass", "Carpet"];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1999 }, (_, i) => THIS_YEAR - i);

export default function Player() {
  const { id = "" } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<RankPoint[]>([]);
  const [matchPage, setMatchPage] = useState<MatchPage | null>(null);
  const [page, setPage] = useState(1);
  const [surface, setSurface] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setProfile(null);
    setError("");
    setPage(1);
    setSurface("");
    setYear("");
    api.player(id).then(setProfile).catch(() => setError("Player not found."));
    api.rankHistory(id).then((r) => setHistory(r.history)).catch(() => {});
  }, [id]);

  useEffect(() => {
    setMatchPage(null);
    api
      .playerMatches(id, page, surface || undefined, year ? Number(year) : undefined)
      .then(setMatchPage)
      .catch(() => {});
  }, [id, page, surface, year]);

  if (error) return <Layout><ErrorNote message={error} /></Layout>;
  if (!profile) return <Layout><Spinner /></Layout>;

  const age = ageFromDob(profile.dob);
  const winPct = profile.wins + profile.losses > 0
    ? ((profile.wins / (profile.wins + profile.losses)) * 100).toFixed(1)
    : null;
  const totalPages = matchPage ? Math.max(1, Math.ceil(matchPage.total / matchPage.pageSize)) : 1;

  return (
    <Layout>
      {/* header card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white">
              {flagEmoji(profile.ioc)} {profile.full_name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
              {age != null && <span className="rounded bg-slate-800 px-2 py-1">Age {age}</span>}
              {profile.height && <span className="rounded bg-slate-800 px-2 py-1">{profile.height} cm</span>}
              {profile.hand && (
                <span className="rounded bg-slate-800 px-2 py-1">
                  {profile.hand === "R" ? "Right-handed" : profile.hand === "L" ? "Left-handed" : "Unknown hand"}
                </span>
              )}
              <span className="rounded bg-slate-800 px-2 py-1">
                Active {formatDate(profile.first_match)} – {formatDate(profile.last_match)}
              </span>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-center sm:grid-cols-4">
            <Stat label="Career W–L" value={`${profile.wins}–${profile.losses}`} sub={winPct ? `${winPct}%` : undefined} />
            <Stat label="Titles" value={String(profile.titles ?? 0)} />
            <Stat label="Current rank" value={profile.latest_rank ? `#${profile.latest_rank}` : "—"}
              sub={profile.latest_rank_date ? formatDate(profile.latest_rank_date) : undefined} />
            <Stat label="Career high" value={profile.best_rank ? `#${profile.best_rank}` : "—"} />
          </dl>
          <div className="flex flex-col items-center gap-1">
            <RatingBadge rating={profile.avg_rating} size="lg" />
            <span className="text-[10px] uppercase tracking-wide text-slate-500">avg rating</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* sidebar */}
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-300">Ranking history</h2>
            <RankSparkline history={history} />
          </section>
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-300">By surface</h2>
            <div className="space-y-3">
              {profile.surfaces.map((s) => (
                <WinLossBar key={s.surface} label={s.surface} wins={s.wins} losses={s.losses} />
              ))}
            </div>
          </section>
        </div>

        {/* match list */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-sm font-semibold text-slate-300">
              Matches {matchPage && <span className="text-slate-500">({matchPage.total})</span>}
            </h2>
            <select value={surface} onChange={(e) => { setSurface(e.target.value); setPage(1); }}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-300">
              <option value="">All surfaces</option>
              {SURFACES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-300">
              <option value="">All years</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {!matchPage ? (
            <Spinner />
          ) : (
            <>
              <div className="space-y-1.5">
                {matchPage.matches.map((m) => (
                  <MatchRow key={m.id} m={m} />
                ))}
                {matchPage.matches.length === 0 && (
                  <div className="py-10 text-center text-sm text-slate-500">No matches for this filter.</div>
                )}
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                    className="rounded-md border border-slate-700 px-3 py-1 text-slate-300 disabled:opacity-40">
                    ← Prev
                  </button>
                  <span className="text-slate-500">Page {page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                    className="rounded-md border border-slate-700 px-3 py-1 text-slate-300 disabled:opacity-40">
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-white">{value}</dd>
      {sub && <dd className="text-xs text-slate-500">{sub}</dd>}
    </div>
  );
}
