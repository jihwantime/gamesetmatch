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
  const totalPages = Math.max(1, Math.ceil(matchPage.total / matchPage.pageSize));
  const lastTen = recent.matches.slice(0, 10).reverse();
  const lastTenWins = lastTen.filter((m) => m.result === "W").length;

  const bio = [
    age != null ? `Age ${age}` : null,
    profile.height ? `${profile.height} cm` : null,
    profile.hand === "R" ? "Right-handed" : profile.hand === "L" ? "Left-handed" : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header>
        <div className="flex items-center gap-2 text-[13px] text-fg/45">
          <span>{flagEmoji(profile.ioc)}</span>
          <span>{profile.ioc}</span>
          {profile.latest_rank != null && (
            <>
              <span className="text-fg/30">·</span>
              <span>World No. {profile.latest_rank}</span>
            </>
          )}
        </div>
        <h1 className="mt-2 text-[44px] font-semibold leading-[1.05] tracking-[-0.035em] text-fg">
          {profile.fullName}
        </h1>
        <p className="mt-3 text-[15px] text-fg/50">
          {bio.join(" · ")}
          {bio.length > 0 && " · "}
          Active {formatDate(profile.first_match)} – {formatDate(profile.last_match)}
        </p>
      </header>

      {/* Career figures as a quiet stat row rather than boxed cards. */}
      <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-8 border-y border-fg/[0.1] py-8 sm:grid-cols-4">
        <Stat label="Win–loss" value={`${profile.wins}\u2013${profile.losses}`} note={`${winPct.toFixed(1)}%`} />
        <Stat label="Titles" value={String(profile.titles ?? 0)} />
        <Stat label="Career high" value={profile.best_rank ? `No. ${profile.best_rank}` : "—"} />
        <div>
          <dt className="text-[11px] uppercase tracking-[0.08em] text-fg/40">Avg rating</dt>
          <dd className="mt-1.5">
            <RatingBadge rating={profile.avg_rating} size="lg" />
          </dd>
        </div>
      </dl>

      <RankHistoryToggle history={history} />

      <div className="mt-14 grid gap-14 sm:grid-cols-[1fr_200px] sm:gap-10">
        <div className="order-2 sm:order-1">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[22px] font-semibold tracking-tight text-fg">
              Matches <span className="text-[15px] font-normal text-fg/40">{matchPage.total}</span>
            </h2>
            <MatchFilters surface={surface ?? ""} year={sp.year ?? ""} />
          </div>

          <div className="border-t border-fg/[0.1]">
            {matchPage.matches.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
          {matchPage.matches.length === 0 && (
            <p className="py-12 text-center text-[14px] text-fg/40">No matches for this filter.</p>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between text-[14px]">
              <PageLink id={id} sp={sp} page={page - 1} disabled={page <= 1}>← Newer</PageLink>
              <span className="text-fg/40">{page} / {totalPages}</span>
              <PageLink id={id} sp={sp} page={page + 1} disabled={page >= totalPages}>Older →</PageLink>
            </div>
          )}
        </div>

        <aside className="order-1 space-y-10 sm:order-2">
          <section>
            <h2 className="mb-4 text-[11px] uppercase tracking-[0.08em] text-fg/40">By surface</h2>
            <div className="space-y-4">
              {profile.surfaces.map((s) => (
                <WinLossBar key={s.surface} label={s.surface} wins={s.wins} losses={s.losses} />
              ))}
            </div>
          </section>

          {lastTen.length > 0 && (
            <section>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-[11px] uppercase tracking-[0.08em] text-fg/40">Last 10</h2>
                <span className="text-[13px] tabular-nums text-fg/50">
                  {lastTenWins}–{lastTen.length - lastTenWins}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lastTen.map((m) => (
                  <Link
                    key={m.id}
                    href={`/match/${m.id}`}
                    title={`${m.result === "W" ? "def." : "lost to"} ${m.opponent_name} · ${m.tourney_name}`}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium transition-transform hover:scale-110 ${
                      m.result === "W" ? "bg-win/20 text-win" : "bg-loss/20 text-loss"
                    }`}
                  >
                    {m.result}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.08em] text-fg/40">{label}</dt>
      <dd className="mt-1.5 whitespace-nowrap text-[24px] font-semibold tabular-nums tracking-tight text-fg">
        {value}
      </dd>
      {note && <dd className="mt-0.5 text-[13px] tabular-nums text-fg/42">{note}</dd>}
    </div>
  );
}

function PageLink({
  id, sp, page, disabled, children,
}: {
  id: number; sp: Record<string, string>; page: number; disabled: boolean; children: React.ReactNode;
}) {
  if (disabled) return <span className="text-fg/25">{children}</span>;
  const q = new URLSearchParams({ ...sp, page: String(page) });
  return (
    <Link href={`/player/${id}?${q}`} className="text-fg/55 transition-colors hover:text-fg">
      {children}
    </Link>
  );
}
