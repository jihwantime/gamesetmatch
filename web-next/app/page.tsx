import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import RatingBadge from "@/components/RatingBadge";
import ScrollReveal from "@/components/ScrollReveal";
import { getLeaderboard } from "@/lib/queries";
import { flagEmoji, formatDate } from "@/lib/format";

// Server Component: the top-10 board is fetched on the server and rendered into
// the HTML, so it is present for crawlers and on first paint.
export default async function Home() {
  const board = await getLeaderboard();
  const current = board.live ?? { entries: board.entries, as_of: board.date };
  const top = current.entries.slice(0, 10);

  return (
    <>
      <div className="flex min-h-[calc(100vh-160px)] flex-col items-center justify-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ball.svg" alt="GameSetMatch" className="h-28 w-28" />
        <p className="mt-6 max-w-md text-slate-400">
          Match histories, stats, and ML performance ratings for every ATP tour-level player
          since 2000.
        </p>
        <div className="mt-8 w-full max-w-xl">
          <SearchBox large />
        </div>
        <p className="mt-3 text-xs text-slate-600">Try “Alcaraz”, “Federer”, or “Del Potro”</p>
        {top.length > 0 && (
          <div className="mt-16 animate-bounce text-slate-600" aria-hidden>
            ▾
          </div>
        )}
      </div>

      {top.length > 0 && (
        <ScrollReveal className="mx-auto max-w-2xl pb-16">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold tracking-wide text-white">
              ATP Top 10 <span className="text-base text-slate-500">· {formatDate(current.as_of)}</span>
            </h2>
            <Link href="/leaderboard" className="text-sm font-semibold text-win hover:underline">
              Full rankings →
            </Link>
          </div>
          <ol className="overflow-hidden rounded-3xl bg-card">
            {top.map((e) => (
              <li key={e.id} className="border-b border-white/5 last:border-0">
                <Link
                  href={`/player/${e.id}`}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-card-2"
                >
                  <span className="w-6 text-right font-display text-lg font-bold text-slate-500">
                    {e.rank}
                  </span>
                  <span>{flagEmoji(e.ioc)}</span>
                  <span className="flex-1 text-left text-sm text-slate-200">{e.full_name}</span>
                  <span className="text-xs tabular-nums text-slate-500">
                    {e.points?.toLocaleString()} pts
                  </span>
                  <RatingBadge rating={e.avg_rating} />
                </Link>
              </li>
            ))}
          </ol>
        </ScrollReveal>
      )}
    </>
  );
}
