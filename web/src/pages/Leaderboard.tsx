import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type LeaderboardEntry } from "../api";
import { Layout, RatingBadge, Spinner } from "../components";
import { flagEmoji, formatDate } from "../lib";

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [date, setDate] = useState<number | null>(null);

  useEffect(() => {
    api.leaderboard().then((r) => {
      setEntries(r.entries);
      setDate(r.date);
    }).catch(() => setEntries([]));
  }, []);

  return (
    <Layout>
      <h1 className="font-display text-4xl font-bold tracking-wide text-white">ATP Rankings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Latest snapshot in the dataset: {formatDate(date)}. Rating is the player's career
        average ML performance rating.
      </p>
      {!entries ? (
        <Spinner />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 text-right">#</th>
                <th className="px-5 py-3">Player</th>
                <th className="px-5 py-3 text-right">Points</th>
                <th className="px-5 py-3 text-right">Avg rating</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-white/5 hover:bg-card-2">
                  <td className="px-5 py-2 text-right font-display text-base font-bold text-slate-500">{e.rank}</td>
                  <td className="px-5 py-2">
                    <Link to={`/player/${e.id}`} className="text-slate-200 hover:text-white hover:underline">
                      {flagEmoji(e.ioc)} {e.full_name}
                    </Link>
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums text-slate-300">
                    {e.points?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-5 py-2 text-right"><RatingBadge rating={e.avg_rating} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
