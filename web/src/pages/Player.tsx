import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type MatchListItem, type MatchPage, type Profile, type RankPoint } from "../api";
import {
  ErrorNote,
  FilterSelect,
  LastTen,
  Layout,
  MatchRow,
  RankHistoryPanel,
  RatingBadge,
  Spinner,
  WinLossBar,
} from "../components";
import { ageFromDob, flagEmoji, formatDate } from "../lib";

const SURFACES = ["Hard", "Clay", "Grass", "Carpet"];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1999 }, (_, i) => THIS_YEAR - i);

export default function Player() {
  const { id = "" } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<RankPoint[]>([]);
  const [matchPage, setMatchPage] = useState<MatchPage | null>(null);
  const [recent, setRecent] = useState<MatchListItem[]>([]);
  const [showRank, setShowRank] = useState(false);
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
    setShowRank(false);
    setRecent([]);
    api.player(id).then(setProfile).catch(() => setError("Player not found."));
    api.rankHistory(id).then((r) => setHistory(r.history)).catch(() => {});
    api.playerMatches(id, 1).then((r) => setRecent(r.matches)).catch(() => {});
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
  const total = profile.wins + profile.losses;
  const winPct = total > 0 ? (profile.wins / total) * 100 : 0;
  const initials = `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`;
  const totalPages = matchPage ? Math.max(1, Math.ceil(matchPage.total / matchPage.pageSize)) : 1;

  return (
    <Layout>
      {/* header card */}
      <div className="rounded-3xl bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-card-2 font-display text-3xl font-bold text-slate-300">
              {initials}
            </div>
            {profile.latest_rank != null && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-win px-2.5 py-0.5 font-display text-sm font-bold text-black">
                #{profile.latest_rank}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-white/5 px-3 py-1 font-medium text-slate-300">ATP Tour</span>
              <span className="text-slate-400">
                {flagEmoji(profile.ioc)} {profile.ioc}
              </span>
            </div>
            <h1 className="mt-1 font-display text-5xl font-bold leading-none tracking-wide text-white">
              {profile.full_name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
              {age != null && <span>Age {age}</span>}
              {profile.height && <><span className="text-slate-700">|</span><span>{profile.height} cm</span></>}
              {profile.hand && (
                <>
                  <span className="text-slate-700">|</span>
                  <span>{profile.hand === "R" ? "Right-Handed" : profile.hand === "L" ? "Left-Handed" : "Unknown hand"}</span>
                </>
              )}
              <span className="text-slate-700">|</span>
              <span>
                Active {formatDate(profile.first_match)} – {formatDate(profile.last_match)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-ink/60 px-6 py-4">
            <HeaderStat label="W–L" value={`${profile.wins}–${profile.losses}`} />
            <Divider />
            <HeaderStat label="Titles" value={String(profile.titles ?? 0)} />
            <Divider />
            <HeaderStat label="Career High" value={profile.best_rank ? `#${profile.best_rank}` : "—"} />
            <Divider />
            <HeaderStat label="Win Rate" value={`${winPct.toFixed(0)}%`} accent />
            <Divider />
            <div className="flex flex-col items-center gap-1">
              <RatingBadge rating={profile.avg_rating} size="lg" />
              <span className="text-[10px] uppercase tracking-wider text-slate-500">avg rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* rank history: standalone toggle at the top */}
      {history.length >= 2 && (
        <div className="mt-4">
          <button
            onClick={() => setShowRank((s) => !s)}
            className={`rounded-full px-5 py-2 font-display text-base font-semibold transition ${
              showRank ? "bg-win text-black" : "bg-card text-slate-300 hover:bg-card-2 hover:text-white"
            }`}
          >
            📈 Rank History {showRank ? "▴" : "▾"}
          </button>
          {showRank && (
            <div className="mt-3">
              <RankHistoryPanel history={history} />
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* sidebar */}
        <div className="space-y-6">
          <section className="rounded-3xl bg-card p-5">
            <h2 className="mb-4 font-display text-xl font-semibold text-white">Career</h2>
            <div className="flex items-end justify-between">
              <div>
                <div className="font-display text-4xl font-bold text-win">▲ {winPct.toFixed(1)}%</div>
                <div className="mt-0.5 text-xs text-slate-500">{profile.wins} Wins</div>
              </div>
              <div className="text-right">
                <div className="font-display text-4xl font-bold text-loss">▼ {(100 - winPct).toFixed(1)}%</div>
                <div className="mt-0.5 text-xs text-slate-500">{profile.losses} Losses</div>
              </div>
            </div>
            <div className="mt-3 flex h-2.5 gap-[2px] overflow-hidden rounded-full">
              <div className="rounded-l-full bg-win" style={{ width: `${winPct}%` }} />
              <div className="flex-1 rounded-r-full bg-loss" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-card-2 px-4 py-3 text-center">
                <div className="font-display text-2xl font-bold text-white">{profile.titles ?? 0}</div>
                <div className="text-xs text-slate-500">Titles</div>
              </div>
              <div className="rounded-2xl bg-card-2 px-4 py-3 text-center">
                <div className="font-display text-2xl font-bold text-white">{total}</div>
                <div className="text-xs text-slate-500">Matches</div>
              </div>
            </div>
          </section>
          <section className="rounded-3xl bg-card p-5">
            <h2 className="mb-4 font-display text-xl font-semibold text-white">By Surface</h2>
            <div className="space-y-3">
              {profile.surfaces.map((s) => (
                <WinLossBar key={s.surface} label={s.surface} wins={s.wins} losses={s.losses} />
              ))}
            </div>
          </section>
          <LastTen matches={recent} />
        </div>

        {/* match list */}
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto font-display text-3xl font-bold text-white">
              Match History{" "}
              {matchPage && <span className="text-lg font-semibold text-slate-500">({matchPage.total})</span>}
            </h2>
            <FilterSelect
              label="Surface"
              value={surface}
              options={[{ value: "", label: "All" }, ...SURFACES.map((s) => ({ value: s, label: s }))]}
              onChange={(v) => { setSurface(v); setPage(1); }}
            />
            <FilterSelect
              label="Season"
              value={year}
              options={[{ value: "", label: "All" }, ...YEARS.map((y) => ({ value: String(y), label: String(y) }))]}
              onChange={(v) => { setYear(v); setPage(1); }}
            />
          </div>

          {!matchPage ? (
            <Spinner />
          ) : (
            <>
              <div className="space-y-2">
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
                    className="rounded-full bg-card px-4 py-1.5 text-slate-300 hover:bg-card-2 disabled:opacity-40">
                    ← Prev
                  </button>
                  <span className="text-slate-500">Page {page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                    className="rounded-full bg-card px-4 py-1.5 text-slate-300 hover:bg-card-2 disabled:opacity-40">
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

function HeaderStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-display text-3xl font-bold tabular-nums ${accent ? "text-win" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-10 w-px bg-white/10" />;
}
