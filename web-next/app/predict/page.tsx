import Link from "next/link";
import PredictorControls from "@/components/PredictorControls";
import { getPrediction } from "@/lib/queries";
import { flagEmoji, LOSS_COLOR, WIN_COLOR } from "@/lib/format";

export const metadata = {
  title: "Match Predictor — GameSetMatch",
  description: "Win probability between any two ATP players from surface-aware Elo ratings.",
};

const SURFACES = ["Hard", "Clay", "Grass"];

// The selection lives in the URL (?p1=&p2=&surface=), so the prediction is
// computed on the server and every matchup is a shareable link.
export default async function PredictPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const p1 = Number(sp.p1) || null;
  const p2 = Number(sp.p2) || null;
  const surface = SURFACES.includes(sp.surface) ? sp.surface : "Hard";

  const result = p1 && p2 && p1 !== p2 ? await getPrediction(p1, p2, surface) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl font-bold tracking-wide text-white">Match Predictor</h1>
      <p className="mt-1 text-sm text-slate-500">
        Win probability from surface-aware <span className="text-slate-300">Elo ratings</span> — the
        standard model for tennis forecasting. Pick two players and a surface.
      </p>

      <PredictorControls
        surfaces={SURFACES}
        surface={surface}
        p1={result ? { id: result.p1.playerId, full_name: result.p1.player.fullName, ioc: result.p1.player.ioc } : null}
        p2={result ? { id: result.p2.playerId, full_name: result.p2.player.fullName, ioc: result.p2.player.ioc } : null}
      />

      {!result ? (
        <div className="mt-12 text-center text-slate-600">Select both players to see the prediction.</div>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="rounded-3xl bg-card p-6">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <div className="font-display text-2xl font-bold text-white">
                  {flagEmoji(result.p1.player.ioc)} {result.p1.player.fullName}
                </div>
                <div className="font-display text-5xl font-bold" style={{ color: WIN_COLOR }}>
                  {Math.round(result.p1.winProb * 100)}%
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-bold text-white">
                  {result.p2.player.fullName} {flagEmoji(result.p2.player.ioc)}
                </div>
                <div className="font-display text-5xl font-bold" style={{ color: LOSS_COLOR }}>
                  {100 - Math.round(result.p1.winProb * 100)}%
                </div>
              </div>
            </div>
            <div className="flex h-4 gap-[2px] overflow-hidden rounded-full">
              <div style={{ width: `${result.p1.winProb * 100}%`, background: WIN_COLOR }} />
              <div className="flex-1" style={{ background: LOSS_COLOR }} />
            </div>
            <p className="mt-3 text-center text-sm text-slate-400">
              On <span className="text-slate-200">{surface}</span>,{" "}
              <span className="font-semibold text-white">
                {result.p1.winProb >= 0.5 ? result.p1.player.fullName : result.p2.player.fullName}
              </span>{" "}
              is favored to win.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <EloCard side={result.p1} surface={surface} accent={WIN_COLOR} />
            <EloCard side={result.p2} surface={surface} accent={LOSS_COLOR} />
          </div>

          <div className="rounded-3xl bg-card p-5 text-center">
            <div className="text-xs uppercase tracking-wider text-slate-500">Head-to-head</div>
            <div className="mt-1 font-display text-2xl font-bold text-white">
              {result.h2h.p1_wins} <span className="text-slate-600">–</span> {result.h2h.p2_wins}
            </div>
            <Link href={`/player/${result.p1.playerId}`}
                  className="mt-1 inline-block text-xs text-slate-500 hover:text-slate-300 hover:underline">
              {result.p1.player.fullName}&apos;s profile →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

type Side = NonNullable<Awaited<ReturnType<typeof getPrediction>>>["p1"];

function EloCard({ side, surface, accent }: { side: Side; surface: string; accent: string }) {
  return (
    <div className="rounded-3xl bg-card p-5">
      <Link href={`/player/${side.playerId}`} className="font-display text-xl font-semibold text-white hover:underline">
        {flagEmoji(side.player.ioc)} {side.player.fullName}
      </Link>
      <div className="mt-3 space-y-1.5 text-sm">
        <Row label={`${surface} Elo (blended)`} value={String(side.blended)} accent={accent} strong />
        <Row label="Overall Elo" value={side.elo.toFixed(0)} />
        <Row label={`${surface} Elo`} value={side.surfaceElo != null ? side.surfaceElo.toFixed(0) : "—"} />
        <Row label="Peak Elo" value={side.peakElo != null ? side.peakElo.toFixed(0) : "—"} />
        <Row label="Matches" value={String(side.matches ?? 0)} />
      </div>
    </div>
  );
}

function Row({ label, value, accent, strong = false }: {
  label: string; value: string; accent?: string; strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`font-display tabular-nums ${strong ? "text-lg font-bold" : "text-slate-200"}`}
            style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </div>
  );
}
