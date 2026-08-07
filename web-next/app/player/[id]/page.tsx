import Link from "next/link";
import { notFound } from "next/navigation";
import MatchRow from "@/components/MatchRow";
import RatingBadge from "@/components/RatingBadge";
import WinLossBar from "@/components/WinLossBar";
import RankHistoryToggle from "@/components/RankHistoryToggle";
import MatchFilters from "@/components/MatchFilters";
import { getPlayerMatches, getPlayerProfile, getRankHistory } from "@/lib/queries";
import { ageFromDob, flagEmoji, formatDate } from "@/lib/format";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };

export async function generateMetadata({ params }: Params) {
  const profile = await getPlayerProfile(Number((await params).id));
  if (!profile) return { title: "Player not found — GameSetMatch" };
  return {
    title: `${profile.fullName} — GameSetMatch`,
    description: `${profile.fullName}: ${profile.wins}-${profile.losses} career record, ${profile.titles} titles, match history and ML performance ratings.`,
  };
}

export default async function PlayerPage({ params, searchParams }: Params) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const surface = sp.surface || undefined;
  const year = Number(sp.year) || undefined;

  // Filters live in the URL, so every filtered view is server-rendered and
  // shareable rather than being client state.
  const [profile, history, matchPage, recent] = await Promise.all([
    getPlayerProfile(id),
    getRankHistory(id),
    getPlayerMatches(id, { page, surface, year }),
    getPlayerMatches(id, { page: 1 }),
  ]);
  if (!profile) notFound();

  const age = ageFromDob(profile.dob);
  const total = profile.wins + profile.losses;
  const winPct = total > 0 ? (profile.wins / total) * 100 : 0;
  const initials = `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`;
  const totalPages = Math.max(1, Math.ceil(matchPage.total / matchPage.pageSize));
  const lastTen = recent.matches.slice(0, 10).reverse();
  const lastTenWins = lastTen.filter((m) => m.result === "W").length;

  return (
    <>
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
              <span className="text-slate-400">{flagEmoji(profile.ioc)} {profile.ioc}</span>
            </div>
            <h1 className="mt-1 font-display text-5xl font-bold leading-none tracking-wide text-white">
              {profile.fullName}
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
              <span>Active {formatDate(profile.first_match)} – {formatDate(profile.last_match)}</span>
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

      <RankHistoryToggle history={history} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
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

          {lastTen.length > 0 && (
            <section className="rounded-3xl bg-card p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-display text-xl font-semibold text-white">Last 10</h2>
                <span className="text-xs tabular-nums text-slate-400">
                  <span className="font-semibold text-win">{lastTenWins}W</span>{" "}
                  <span className="text-slate-500">{lastTen.length - lastTenWins}L</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lastTen.map((m) => (
                  <Link
                    key={m.id}
                    href={`/match/${m.id}`}
                    title={`${m.result === "W" ? "def." : "lost to"} ${m.opponent_name} · ${m.tourney_name} ${m.round}`}
                    className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-bold ${
                      m.result === "W" ? "bg-win text-black" : "bg-loss text-black"
                    }`}
                  >
                    {m.result}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto font-display text-3xl font-bold text-white">
              Match History <span className="text-lg font-semibold text-slate-500">({matchPage.total})</span>
            </h2>
            <MatchFilters surface={surface ?? ""} year={sp.year ?? ""} />
          </div>

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
              <PageLink id={id} sp={sp} page={page - 1} disabled={page <= 1}>← Prev</PageLink>
              <span className="text-slate-500">Page {page} / {totalPages}</span>
              <PageLink id={id} sp={sp} page={page + 1} disabled={page >= totalPages}>Next →</PageLink>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PageLink({
  id, sp, page, disabled, children,
}: {
  id: number; sp: Record<string, string>; page: number; disabled: boolean; children: React.ReactNode;
}) {
  const cls = "rounded-full bg-card px-4 py-1.5 text-slate-300";
  if (disabled) return <span className={`${cls} opacity-40`}>{children}</span>;
  const q = new URLSearchParams({ ...sp, page: String(page) });
  return <Link href={`/player/${id}?${q}`} className={`${cls} hover:bg-card-2`}>{children}</Link>;
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
