import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { api, type MatchListItem, type RankPoint, type SearchPlayer } from "./api";
import { flagEmoji, formatDate, LEVEL_CHIP, parseSets, ratingTier } from "./lib";

export const WIN_COLOR = "#b4f416";
export const LOSS_COLOR = "#f97316";

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
        className={`w-full rounded-full border border-white/10 bg-card text-slate-100 placeholder-slate-500
          focus:border-win/60 focus:outline-none ${large ? "px-6 py-3.5 text-lg" : "px-4 py-1.5 text-sm"}`}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl">
          {results.map((p, i) => (
            <li key={p.id}>
              <button
                onMouseDown={(e) => { e.preventDefault(); go(p); }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                  i === active ? "bg-card-2 text-white" : "text-slate-300"
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
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <Link to="/" className="mr-3 font-display text-2xl font-bold tracking-wide text-white">
            🎾 GameSetMatch
          </Link>
          <NavLink
            to="/leaderboard"
            className={({ isActive }) =>
              `rounded-full px-4 py-1.5 text-sm font-semibold ${
                isActive ? "bg-win text-black" : "bg-card text-slate-300 hover:bg-card-2 hover:text-white"
              }`
            }
          >
            🏆 Rankings
          </NavLink>
          <div className="ml-auto">{!hideSearch && <SearchBox />}</div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      <footer className="mx-auto max-w-5xl px-4 pb-8 pt-4 text-xs text-slate-600">
        Data:{" "}
        <a className="underline hover:text-slate-400" href="https://github.com/JeffSackmann/tennis_atp">
          Jeff Sackmann's tennis_atp
        </a>{" "}
        (CC BY-NC-SA 4.0) with current-season results from{" "}
        <a className="underline hover:text-slate-400" href="http://www.tennis-data.co.uk">
          tennis-data.co.uk
        </a>{" "}
        · ATP tour-level matches since 2000
      </footer>
    </div>
  );
}

export function RatingBadge({ rating, size = "md" }: { rating: number | null; size?: "md" | "lg" }) {
  const tier = ratingTier(rating);
  return (
    <span
      title="ML performance rating (0–10)"
      className={`inline-flex items-center justify-center rounded-lg font-display font-semibold tabular-nums ${tier.className} ${
        size === "lg" ? "px-3 py-1 text-2xl" : "min-w-10 px-2 py-0.5 text-base"
      }`}
    >
      {tier.label}
    </span>
  );
}

function SetScores({ m }: { m: MatchListItem }) {
  const sets = parseSets(m.score, m.result === "W");
  if (!sets) {
    return <span className="text-xs text-slate-500">{m.score ?? "—"}</span>;
  }
  const accent = m.result === "W" ? "text-win" : "text-loss";
  return (
    <div className="flex items-center gap-1.5">
      {sets.map((s, i) => (
        <div
          key={i}
          className="flex w-7 flex-col items-center rounded-lg bg-card-2 py-1 font-display text-base font-semibold leading-tight"
        >
          <span className={s.won ? accent : "text-slate-200"}>
            {s.mine}
            {s.tb != null && !s.won && <sup className="text-[9px] text-slate-500">{s.tb}</sup>}
          </span>
          <span className="text-slate-400">
            {s.theirs}
            {s.tb != null && s.won && <sup className="text-[9px] text-slate-500">{s.tb}</sup>}
          </span>
        </div>
      ))}
      {/RET/.test(m.score ?? "") && <span className="ml-1 text-[10px] uppercase text-slate-500">ret</span>}
    </div>
  );
}

export function MatchRow({ m }: { m: MatchListItem }) {
  const win = m.result === "W";
  return (
    <Link
      to={`/match/${m.id}`}
      className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-card px-4 py-3.5 pl-5 transition hover:bg-card-2"
    >
      <span className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${win ? "bg-win" : "bg-loss"}`} />
      <div className="w-20 shrink-0">
        <span
          className={`inline-block rounded-full px-3 py-1 font-display text-sm font-bold ${
            win ? "bg-win text-black" : "bg-loss text-black"
          }`}
        >
          {win ? "Win" : "Loss"}
        </span>
        <div className="mt-1.5 text-[11px] text-slate-500">{formatDate(m.tourney_date)}</div>
      </div>
      <div className="w-40 shrink-0">
        <div className="flex items-center gap-2 text-[11px]">
          {m.tourney_level && (
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-medium text-slate-400">
              {LEVEL_CHIP[m.tourney_level] ?? m.tourney_level}
            </span>
          )}
          {m.surface && <span className="font-medium text-sky-400">{m.surface}</span>}
        </div>
        <div className="mt-1 truncate font-display text-lg font-semibold leading-tight text-white">
          {m.tourney_name}
        </div>
        <div className="text-[11px] text-slate-500">{m.round}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-slate-500">{win ? "defeated" : "lost to"}</div>
        <div className="truncate font-display text-lg font-semibold leading-tight text-white">
          {flagEmoji(m.opponent_ioc)} {m.opponent_name}
        </div>
        <div className="text-[11px] text-slate-500">
          {m.opponent_rank != null ? `#${m.opponent_rank}` : "unranked"}
          {m.opponent_ioc && ` · ${m.opponent_ioc}`}
        </div>
      </div>
      <div className="hidden sm:block">
        <SetScores m={m} />
      </div>
      {m.minutes != null && (
        <span className="hidden w-12 text-right text-xs tabular-nums text-slate-500 md:block">
          🕐 {Math.floor(m.minutes / 60)}:{String(m.minutes % 60).padStart(2, "0")}
        </span>
      )}
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
            <circle cx={x(hovered.ranking_date)} cy={y(hovered.rank)} r="3.5" fill={WIN_COLOR} stroke="#0b0b0a" strokeWidth="2" />
          </>
        )}
      </svg>
      {hovered && (
        <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 rounded-lg bg-card-2 px-2 py-1 text-xs text-slate-200 shadow">
          #{hovered.rank} · {formatDate(hovered.ranking_date)}
        </div>
      )}
    </div>
  );
}

// Horizontal win-rate bar: lime fill on a dark track, always labeled.
export function WinLossBar({ label, wins, losses }: { label: string; wins: number; losses: number }) {
  const total = wins + losses;
  const winPct = total > 0 ? (wins / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="tabular-nums text-slate-300">
          {wins}W <span className="text-slate-500">{losses}L</span>{" "}
          {total > 0 && <span className="font-semibold text-win">{winPct.toFixed(0)}%</span>}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/5"
        role="img"
        aria-label={`${label}: ${wins} wins, ${losses} losses`}
      >
        <div className="h-full rounded-full" style={{ width: `${winPct}%`, background: WIN_COLOR }} />
      </div>
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1 rounded-full bg-card px-4 py-1.5 text-sm text-slate-300">
      <span className="text-slate-500">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent pr-1 font-semibold text-slate-200 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card">
            {o.label}
          </option>
        ))}
      </select>
      <span className="text-xs text-slate-500">▾</span>
    </label>
  );
}

export function Spinner() {
  return <div className="py-16 text-center text-slate-500">Loading…</div>;
}

export function ErrorNote({ message }: { message: string }) {
  return <div className="py-16 text-center text-loss">{message}</div>;
}
