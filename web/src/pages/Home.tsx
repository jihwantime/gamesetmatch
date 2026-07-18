import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, type LeaderboardEntry } from "../api";
import { Layout, RatingBadge, SearchBox } from "../components";
import { flagEmoji, formatDate } from "../lib";

export default function Home() {
  const [top, setTop] = useState<LeaderboardEntry[]>([]);
  const [date, setDate] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.leaderboard().then((r) => {
      setTop(r.entries.slice(0, 10));
      setDate(r.date);
    }).catch(() => {});
  }, []);

  // reveal the top-10 only once the user scrolls it into view
  useEffect(() => {
    if (top.length === 0 || !topRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(topRef.current);
    return () => obs.disconnect();
  }, [top.length]);

  return (
    <Layout hideSearch>
      {/* hero fills the viewport so the top-10 sits below the fold */}
      <div className="flex min-h-[calc(100vh-160px)] flex-col items-center justify-center text-center">
        <img src="/ball.svg" alt="GameSetMatch" className="h-28 w-28" />
        <p className="mt-6 max-w-md text-slate-400">
          Match histories, stats, and ML performance ratings for every ATP
          tour-level player since 2000.
        </p>
        <div className="mt-8 w-full max-w-xl">
          <SearchBox large />
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Try “Alcaraz”, “Federer”, or “Del Potro”
        </p>
        {top.length > 0 && (
          <div className="mt-16 animate-bounce text-slate-600" aria-hidden>
            ▾
          </div>
        )}
      </div>

      {top.length > 0 && (
        <div
          ref={topRef}
          className={`mx-auto max-w-2xl pb-16 transition-all duration-700 ease-out ${
            revealed ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
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
