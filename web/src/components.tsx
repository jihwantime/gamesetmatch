import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type MatchListItem, type RankPoint, type SearchPlayer } from "./api";
import { flagEmoji, formatDate, LEVEL_BADGE, ratingTier } from "./lib";

export const WIN_COLOR = "#3b82f6";
export const LOSS_COLOR = "#ef4444";

export function SearchBox({ large = false }: { large?: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchPlayer[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .search(q.trim())
        .then((r) => {
          setResults(r.players);
          setOpen(true);
          setActive(0);
        })
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (p: SearchPlayer) => {
    setOpen(false);
    setQ("");
    navigate(`/player/${p.id}`);
  };

  return (
    <div ref={boxRef} className={`relative ${large ? "w-full max-w-xl" : "w-64"}`}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || results.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
          if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search a player…"
        aria-label="Search players"
        className={`w-full rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500
          focus:border-sky-500 focus:outline-none ${large ? "px-5 py-3.5 text-lg" : "px-3 py-1.5 text-sm"}`}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          {results.map((p, i) => (
            <li key={p.id}>
              <button
                onMouseDown={(e) => { e.preventDefault(); go(p); }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                  i === active ? "bg-slate-800 text-white" : "text-slate-300"
                }`}
              >
                <span>{flagEmoji(p.ioc)}</span>
                <span className="flex-1">{p.full_name}</span>
                <span className="text-xs text-slate-500">{p.total_matches} matches</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Layout({ children, hideSearch = false }: { children: React.ReactNode; hideSearch?: boolean }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight text-white">
            🎾 GameSetMatch
          </Link>
          <Link to="/leaderboard" className="text-sm text-slate-400 hover:text-white">
            Leaderboard
          </Link>
          <div className="ml-auto">{!hideSearch && <SearchBox />}</div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      <footer className="mx-auto max-w-5xl px-4 pb-8 pt-4 text-xs text-slate-600">
        Data:{" "}
        <a className="underline hover:text-slate-400" href="https://github.com/JeffSackmann/tennis_atp">
          Jeff Sackmann's tennis_atp
        </a>{" "}
        (CC BY-NC-SA 4.0) · ATP tour-level matches 2000–2025
      </footer>
    </div>
  );
}

export function RatingBadge({ rating, size = "md" }: { rating: number | null; size?: "md" | "lg" }) {
  const tier = ratingTier(rating);
  return (
    <span
      title="ML performance rating (0–10)"
      className={`inline-flex items-center justify-center rounded-md font-semibold tabular-nums ${tier.className} ${
        size === "lg" ? "px-3 py-1 text-lg" : "min-w-10 px-2 py-0.5 text-sm"
      }`}
    >
      {tier.label}
    </span>
  );
}

export function MatchRow({ m }: { m: MatchListItem }) {
  const win = m.result === "W";
  return (
    <Link
      to={`/match/${m.id}`}
      className={`flex items-center gap-3 rounded-lg border-l-4 bg-slate-900 px-4 py-3 transition hover:bg-slate-800/80 ${
        win ? "border-[#3b82f6]" : "border-[#ef4444]"
      }`}
    >
      <span
        className={`w-6 shrink-0 text-center text-sm font-bold ${win ? "text-[#3b82f6]" : "text-[#ef4444]"}`}
      >
        {m.result}
      </span>
      <div className="w-40 shrink-0">
        <div className="truncate text-sm text-slate-200">{m.tourney_name}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          <span>{formatDate(m.tourney_date)}</span>
          {m.tourney_level && (
            <span className={`rounded px-1 py-px text-[10px] font-medium ${LEVEL_BADGE[m.tourney_level] ?? ""}`}>
              {m.tourney_level}
            </span>
          )}
        </div>
      </div>
      <div className="w-12 shrink-0 text-xs text-slate-400">{m.round}</div>
      <div className="min-w-0 flex-1">
        <span className="text-sm text-slate-400">vs </span>
        <span className="truncate text-sm text-slate-200">
          {flagEmoji(m.opponent_ioc)} {m.opponent_name}
        </span>
        {m.opponent_rank != null && <span className="ml-1 text-xs text-slate-500">#{m.opponent_rank}</span>}
      </div>
      <div className="hidden text-sm tabular-nums text-slate-300 sm:block">{m.score ?? "—"}</div>
      <RatingBadge rating={m.rating} />
    </Link>
  );
}

// Career rank sparkline: y is rank (1 at the top), with crosshair + tooltip.
export function RankSparkline({ history }: { history: RankPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (history.length < 2) return <div className="text-sm text-slate-500">Not enough ranking data.</div>;

  const W = 320;
  const H = 90;
  const PAD = 4;
  const dates = history.map((p) => p.ranking_date);
  const minD = dates[0];
  const maxD = dates[dates.length - 1];
  const maxRank = Math.max(...history.map((p) => p.rank));
  const x = (d: number) => PAD + ((d - minD) / Math.max(1, maxD - minD)) * (W - 2 * PAD);
  // sqrt scale keeps the top-10 region readable while still showing deep ranks
  const y = (r: number) => PAD + (Math.sqrt(r - 1) / Math.sqrt(Math.max(2, maxRank) - 1)) * (H - 2 * PAD);
  const points = history.map((p) => `${x(p.ranking_date).toFixed(1)},${y(p.rank).toFixed(1)}`).join(" ");

  const hovered = hover != null ? history[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Ranking history from ${formatDate(minD)} to ${formatDate(maxD)}, best rank ${Math.min(
          ...history.map((p) => p.rank)
        )}`}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          let best = 0;
          let bestDist = Infinity;
          history.forEach((p, i) => {
            const d = Math.abs(x(p.ranking_date) - px);
            if (d < bestDist) { bestDist = d; best = i; }
          });
          setHover(best);
        }}
        onMouseLeave={() => setHover(null)}
      >
        <polyline points={points} fill="none" stroke={WIN_COLOR} strokeWidth="2" strokeLinejoin="round" />
        {hovered && (
          <>
            <line
              x1={x(hovered.ranking_date)} x2={x(hovered.ranking_date)} y1="0" y2={H}
              stroke="#64748b" strokeWidth="1" strokeDasharray="3 2"
            />
            <circle cx={x(hovered.ranking_date)} cy={y(hovered.rank)} r="3.5" fill={WIN_COLOR} stroke="#0f172a" strokeWidth="2" />
          </>
        )}
      </svg>
      {hovered && (
        <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 shadow">
          #{hovered.rank} · {formatDate(hovered.ranking_date)}
        </div>
      )}
    </div>
  );
}

// Horizontal win/loss split bar with a 2px gap between the fills.
export function WinLossBar({ label, wins, losses }: { label: string; wins: number; losses: number }) {
  const total = wins + losses;
  const winPct = total > 0 ? (wins / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="tabular-nums text-slate-300">
          {wins}W – {losses}L{total > 0 && <span className="ml-1 text-slate-500">({winPct.toFixed(0)}%)</span>}
        </span>
      </div>
      <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-slate-800" role="img" aria-label={`${label}: ${wins} wins, ${losses} losses`}>
        {wins > 0 && <div style={{ width: `${winPct}%`, background: WIN_COLOR }} />}
        {losses > 0 && <div className="flex-1" style={{ background: LOSS_COLOR }} />}
      </div>
    </div>
  );
}

export function Spinner() {
  return <div className="py-16 text-center text-slate-500">Loading…</div>;
}

export function ErrorNote({ message }: { message: string }) {
  return <div className="py-16 text-center text-red-400">{message}</div>;
}
