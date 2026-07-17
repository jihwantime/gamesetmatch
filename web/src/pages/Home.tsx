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
        <h1 className="text-5xl font-extrabold tracking-tight text-white">
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
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              ATP Top 10 · {formatDate(date)}
            </h2>
            <Link to="/leaderboard" className="text-sm text-sky-400 hover:underline">
              Full leaderboard →
            </Link>
          </div>
          <ol className="overflow-hidden rounded-xl border border-slate-800">
            {top.map((e) => (
              <li key={e.id} className="border-b border-slate-800/60 last:border-0">
                <Link
                  to={`/player/${e.id}`}
                  className="flex items-center gap-3 bg-slate-900 px-4 py-2.5 hover:bg-slate-800/80"
                >
                  <span className="w-6 text-right font-mono text-sm text-slate-500">{e.rank}</span>
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
