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

// Search-and-select a single player (for the predictor). Unlike SearchBox it
// keeps a selected player instead of navigating away.
export function PlayerPicker({
  selected,
  onSelect,
  accent,
}: {
  selected: SearchPlayer | null;
  onSelect: (p: SearchPlayer | null) => void;
  accent: string;
}) {
  const [q, setQ] = useState(selected?.full_name ?? "");
  const [results, setResults] = useState<SearchPlayer[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const pick = (p: SearchPlayer) => {
    onSelect(p);
    setQ(p.full_name);
    setResults([]);
    setOpen(false);
  };

  useEffect(() => {
    // don't re-search while the input still shows the already-picked player's name
    if (selected && q === selected.full_name) return setResults([]);
    if (q.trim().length < 2) return setResults([]);
    const t = setTimeout(() => {
      api.search(q.trim()).then((r) => { setResults(r.players); setOpen(true); }).catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q, selected]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <div
        className={`flex items-center gap-2 rounded-2xl bg-card px-4 py-3 ${
          selected ? "" : "border border-white/10"
        }`}
        style={selected ? { boxShadow: `inset 0 0 0 2px ${accent}` } : undefined}
      >
        {selected && <span className="text-2xl">{flagEmoji(selected.ioc)}</span>}
        <input
          value={q}
          onChange={(e) => {
            if (selected) onSelect(null); // editing the name clears the pick until a new one is chosen
            setQ(e.target.value);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search a player…"
          className="w-full bg-transparent text-center font-display text-xl font-semibold text-white placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-slate-500 focus:outline-none"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl">
          {results.map((p) => (
            <li key={p.id}>
              <button
                onMouseDown={(e) => { e.preventDefault(); pick(p); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-300 hover:bg-card-2"
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

function NavTab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative py-1 text-sm font-semibold tracking-wide transition ${
          isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {label}
          {isActive && (
            <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-win" />
          )}
        </>
      )}
    </NavLink>
  );
}

export function Layout({ children, hideSearch = false }: { children: React.ReactNode; hideSearch?: boolean }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
          <Link to="/" className="mr-1" aria-label="GameSetMatch home">
            <img src="/ball.svg" alt="GameSetMatch" className="h-9 w-9 transition hover:rotate-12" />
          </Link>
          <NavTab to="/leaderboard" label="Rankings" />
          <NavTab to="/predict" label="Match Prediction" />
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

// op.gg-style tier graph: evenly spaced labeled points, monthly / all-time tabs.
export function RankHistoryPanel({ history }: { history: RankPoint[] }) {
  const [mode, setMode] = useState<"monthly" | "alltime">("monthly");
  if (history.length < 2) {
    return <div className="py-6 text-center text-sm text-slate-500">Not enough ranking data.</div>;
  }

  let pts: RankPoint[];
  if (mode === "monthly") {
    // last snapshot of each month, most recent 12 months in the data
    const byMonth = new Map<number, RankPoint>();
    for (const p of history) byMonth.set(Math.floor(p.ranking_date / 100), p);
    pts = [...byMonth.values()].slice(-12);
  } else {
    // ~12 evenly spaced points across the career, always including first and last
    const n = Math.min(12, history.length);
    const idx = new Set<number>();
    for (let i = 0; i < n; i++) idx.add(Math.round((i * (history.length - 1)) / (n - 1)));
    pts = [...idx].sort((a, b) => a - b).map((i) => history[i]);
  }

  const W = 960;
  const H = 250;
  const TOP = 64;
  const BOTTOM = 36;
  const SIDE = 50;
  const minRank = Math.min(...pts.map((p) => p.rank));
  const maxRank = Math.max(...pts.map((p) => p.rank));
  const x = (i: number) => (pts.length === 1 ? W / 2 : SIDE + (i * (W - 2 * SIDE)) / (pts.length - 1));
  const y = (r: number) =>
    maxRank === minRank ? (TOP + H - BOTTOM) / 2 : TOP + ((r - minRank) / (maxRank - minRank)) * (H - TOP - BOTTOM);
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.rank).toFixed(1)}`).join(" ");

  const fmtAxis = (d: number) =>
    mode === "monthly"
      ? `${String(Math.floor((d % 10000) / 100)).padStart(2, "0")}/${String(d % 100).padStart(2, "0")}`
      : `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Math.floor((d % 10000) / 100) - 1]} '${String(Math.floor(d / 10000) % 100).padStart(2, "0")}`;

  return (
    <section className="rounded-3xl bg-card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-white">Rank History</h2>
        <div className="flex gap-1 rounded-full bg-card-2 p-1 text-sm">
          {(["monthly", "alltime"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1 font-semibold ${
                mode === m ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {m === "monthly" ? "Monthly" : "All time"}
            </button>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Ranking history, best rank ${minRank}`}
      >
        <line x1={SIDE - 20} x2={W - SIDE + 20} y1={H - BOTTOM + 12} y2={H - BOTTOM + 12} stroke="#ffffff14" />
        <polyline points={line} fill="none" stroke={WIN_COLOR} strokeWidth="2.5" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={p.ranking_date}>
            <circle cx={x(i)} cy={y(p.rank)} r="4.5" fill={WIN_COLOR} stroke="#0b0b0a" strokeWidth="2.5" />
            <text
              x={x(i)} y={y(p.rank) - 26} textAnchor="middle"
              className="font-display" fontSize="17" fontWeight="700" fill="#fff"
            >
              #{p.rank}
            </text>
            {p.points != null && (
              <text x={x(i)} y={y(p.rank) - 11} textAnchor="middle" fontSize="10.5" fill="#94a3b8">
                {p.points.toLocaleString()} pts
              </text>
            )}
            <text x={x(i)} y={H - BOTTOM + 30} textAnchor="middle" fontSize="11" fill="#64748b">
              {fmtAxis(p.ranking_date)}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}

// Recent form: last 10 results as labeled W/L dots, oldest → newest.
export function LastTen({ matches }: { matches: MatchListItem[] }) {
  const last = matches.slice(0, 10).reverse();
  if (last.length === 0) return null;
  const wins = last.filter((m) => m.result === "W").length;
  return (
    <section className="rounded-3xl bg-card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold text-white">Last 10</h2>
        <span className="text-xs tabular-nums text-slate-400">
          <span className="font-semibold text-win">{wins}W</span>{" "}
          <span className="text-slate-500">{last.length - wins}L</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {last.map((m) => (
          <Link
            key={m.id}
            to={`/match/${m.id}`}
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
