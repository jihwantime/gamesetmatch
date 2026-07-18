import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type LeaderboardEntry } from "../api";
import { Layout, RatingBadge, SearchBox } from "../components";
import { flagEmoji, formatDate } from "../lib";

export default function Home() {
  const [top, setTop] = useState<LeaderboardEntry[]>([]);
  const [date, setDate] = useState<number | null>(null);

  useEffect(() => {
    api.leaderboard().then((r) => {
      setTop(r.entries.slice(0, 10));
      setDate(r.date);
    }).catch(() => {});
  }, []);

  return (
    <Layout hideSearch>
      <div className="flex flex-col items-center pt-16 text-center">
        <h1 className="font-display text-7xl font-bold tracking-wide text-white">
          🎾 GameSetMatch
        </h1>
        <p className="mt-3 max-w-md text-slate-400">
          Match histories, stats, and ML performance ratings for every ATP
          tour-level player since 2000.
        </p>
        <div className="mt-8 w-full max-w-xl">
          <SearchBox large />
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Try “Alcaraz”, “Federer”, or “Del Potro”
        </p>
      </div>

      {top.length > 0 && (
        <div className="mx-auto mt-16 max-w-2xl">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold tracking-wide text-white">
              ATP Top 10 <span className="text-base text-slate-500">· {formatDate(date)}</span>
            </h2>
            <Link to="/leaderboard" className="text-sm font-semibold text-win hover:underline">
              Full rankings →
            </Link>
          </div>
          <ol className="overflow-hidden rounded-3xl bg-card">
            {top.map((e) => (
              <li key={e.id} className="border-b border-white/5 last:border-0">
                <Link
                  to={`/player/${e.id}`}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-card-2"
                >
                  <span className="w-6 text-right font-display text-lg font-bold text-slate-500">{e.rank}</span>
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
        </div>
      )}
    </Layout>
  );
}
