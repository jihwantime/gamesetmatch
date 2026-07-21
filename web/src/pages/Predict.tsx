import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Prediction, type SearchPlayer } from "../api";
import { Layout, PlayerPicker, WIN_COLOR, LOSS_COLOR } from "../components";
import { flagEmoji } from "../lib";

const SURFACES = ["Hard", "Clay", "Grass"];

export default function Predict() {
  const [p1, setP1] = useState<SearchPlayer | null>(null);
  const [p2, setP2] = useState<SearchPlayer | null>(null);
  const [surface, setSurface] = useState("Hard");
  const [result, setResult] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // re-predict whenever both players or the surface change
  useEffect(() => {
    if (!p1 || !p2) {
      setResult(null);
      return;
    }
    if (p1.id === p2.id) {
      setError("Pick two different players.");
      setResult(null);
      return;
    }
    setError("");
    setLoading(true);
    api
      .predict(p1.id, p2.id, surface)
      .then(setResult)
      .catch(() => setError("No Elo rating for one of these players."))
      .finally(() => setLoading(false));
  }, [p1, p2, surface]);

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl font-bold tracking-wide text-white">Match Predictor</h1>
        <p className="mt-1 text-sm text-slate-500">
          Win probability from surface-aware{" "}
          <span className="text-slate-300">Elo ratings</span> — the standard model for tennis
          forecasting. Pick two players and a surface.
        </p>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <PlayerPicker selected={p1} onSelect={setP1} accent={WIN_COLOR} />
          <span className="font-display text-2xl font-bold text-slate-600">vs</span>
          <PlayerPicker selected={p2} onSelect={setP2} accent={LOSS_COLOR} />
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {SURFACES.map((s) => (
            <button
              key={s}
              onClick={() => setSurface(s)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                surface === s ? "bg-win text-black" : "bg-card text-slate-300 hover:bg-card-2"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {error && <div className="mt-8 text-center text-loss">{error}</div>}
        {loading && <div className="mt-8 text-center text-slate-500">Predicting…</div>}
        {!p1 || !p2 ? (
          <div className="mt-12 text-center text-slate-600">
            Select both players to see the prediction.
          </div>
        ) : (
          result && <Result result={result} surface={surface} />
        )}
      </div>
    </Layout>
  );
}

function Result({ result, surface }: { result: Prediction; surface: string }) {
  const { p1, p2, h2h } = result;
  const pct1 = Math.round(p1.win_prob * 100);
  const pct2 = 100 - pct1;
  const favored = p1.win_prob >= p2.win_prob ? p1 : p2;

  return (
    <div className="mt-8 space-y-6">
      {/* probability bar */}
      <div className="rounded-3xl bg-card p-6">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <div className="font-display text-2xl font-bold text-white">
              {flagEmoji(p1.ioc)} {p1.full_name}
            </div>
            <div className="font-display text-5xl font-bold" style={{ color: WIN_COLOR }}>{pct1}%</div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-bold text-white">
              {p2.full_name} {flagEmoji(p2.ioc)}
            </div>
            <div className="font-display text-5xl font-bold" style={{ color: LOSS_COLOR }}>{pct2}%</div>
          </div>
        </div>
        <div className="flex h-4 gap-[2px] overflow-hidden rounded-full">
          <div style={{ width: `${pct1}%`, background: WIN_COLOR }} />
          <div className="flex-1" style={{ background: LOSS_COLOR }} />
        </div>
        <p className="mt-3 text-center text-sm text-slate-400">
          On <span className="text-slate-200">{surface}</span>,{" "}
          <span className="font-semibold text-white">{favored.full_name}</span> is favored to win.
        </p>
      </div>

      {/* elo + h2h detail */}
      <div className="grid gap-4 sm:grid-cols-2">
        <EloCard side={p1} surface={surface} accent={WIN_COLOR} />
        <EloCard side={p2} surface={surface} accent={LOSS_COLOR} />
      </div>

      <div className="rounded-3xl bg-card p-5 text-center">
        <div className="text-xs uppercase tracking-wider text-slate-500">Head-to-head</div>
        <div className="mt-1 font-display text-2xl font-bold text-white">
          {h2h.p1_wins} <span className="text-slate-600">–</span> {h2h.p2_wins}
        </div>
        <Link
          to={`/player/${p1.player_id}`}
          className="mt-1 inline-block text-xs text-slate-500 hover:text-slate-300 hover:underline"
        >
          {p1.full_name}'s profile →
        </Link>
      </div>
    </div>
  );
}

function EloCard({ side, surface, accent }: { side: Prediction["p1"]; surface: string; accent: string }) {
  const surfaceElo =
    surface === "Hard" ? side.elo_hard
    : surface === "Clay" ? side.elo_clay
    : side.elo_grass;
  return (
    <div className="rounded-3xl bg-card p-5">
      <Link to={`/player/${side.player_id}`} className="font-display text-xl font-semibold text-white hover:underline">
        {flagEmoji(side.ioc)} {side.full_name}
      </Link>
      <div className="mt-3 space-y-1.5 text-sm">
        <Row label={`${surface} Elo (blended)`} value={String(side.surface_rating)} accent={accent} strong />
        <Row label="Overall Elo" value={side.elo.toFixed(0)} />
        <Row label={`${surface} Elo`} value={surfaceElo != null ? surfaceElo.toFixed(0) : "—"} />
        <Row label="Peak Elo" value={side.peak_elo != null ? side.peak_elo.toFixed(0) : "—"} />
        <Row label="Matches" value={String(side.matches ?? 0)} />
      </div>
    </div>
  );
}

function Row({ label, value, accent, strong = false }: { label: string; value: string; accent?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-slate-500">{label}</span>
      <span
        className={`font-display tabular-nums ${strong ? "text-lg font-bold" : "text-slate-200"}`}
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
