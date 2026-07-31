import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type LeaderboardEntry } from "../api";
import { Layout, RatingBadge, Spinner } from "../components";
import { flagEmoji, formatDate } from "../lib";

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [date, setDate] = useState<number | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const [live, setLive] = useState<{ as_of: number; entries: LeaderboardEntry[] } | null>(null);

  useEffect(() => {
    api.leaderboard().then((r) => {
      setEntries(r.entries);
      setDate(r.date);
      setUpdated(r.updated);
      setLive(r.live);
    }).catch(() => setEntries([]));
  }, []);

  return (
    <Layout>
      <h1 className="font-display text-4xl font-bold tracking-wide text-white">ATP Rankings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Form is the player's average ML performance rating over their last 20 matches.
        {updated && <> Refreshed weekly — last update {updated}.</>}
      </p>

      {live && (
        <section className="mt-6">
          <div className="mb-2 flex items-baseline gap-2">
            <h2 className="font-display text-2xl font-semibold tracking-wide text-white">
              Live Top 20
            </h2>
            <span className="rounded-full bg-win/15 px-2 py-0.5 text-xs font-semibold text-win">
              as of {formatDate(live.as_of)}
            </span>
          </div>
          <RankTable rows={live.entries} />
        </section>
      )}

      <section className="mt-8">
        <div className="mb-2 flex items-baseline gap-2">
          <h2 className="font-display text-2xl font-semibold tracking-wide text-white">
            Full Top 100
          </h2>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-semibold text-slate-400">
            archive snapshot · {formatDate(date)}
          </span>
        </div>
        {!entries ? <Spinner /> : <RankTable rows={entries} />}
      </section>

      {live && (
        <p className="mt-4 text-xs text-slate-600">
          The live board comes from Wikipedia's weekly ATP release; the full table comes from
          Jeff Sackmann's archive, which publishes ranking snapshots a few weeks behind. They
          are shown separately because ranking points are a rolling 52-week total — blending
          two different weeks would produce an inconsistent table.
        </p>
      )}
    </Layout>
  );
}

function RankTable({ rows }: { rows: LeaderboardEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-3xl bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="px-5 py-3 text-right">#</th>
            <th className="px-5 py-3">Player</th>
            <th className="px-5 py-3 text-right">Points</th>
            <th className="px-5 py-3 text-right">Form (L20)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-t border-white/5 hover:bg-card-2">
              <td className="px-5 py-2 text-right font-display text-base font-bold text-slate-500">
                {e.rank}
              </td>
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
  );
}
