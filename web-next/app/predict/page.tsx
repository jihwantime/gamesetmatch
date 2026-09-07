import Link from "next/link";
import PredictorControls from "@/components/PredictorControls";
import { getPrediction } from "@/lib/queries";
import { flagEmoji } from "@/lib/format";

export const metadata = {
  title: "Match Prediction — GameSetMatch",
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

  const pct1 = result ? Math.round(result.p1.winProb * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-[40px] font-semibold leading-tight tracking-[-0.03em] text-white">
          Match prediction
        </h1>
        <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-white/50">
          Win probability from surface-aware Elo ratings — the standard model for tennis
          forecasting. Choose two players and a surface.
        </p>
      </header>

      <PredictorControls
        surfaces={SURFACES}
        surface={surface}
        p1={result ? { id: result.p1.playerId, full_name: result.p1.player.fullName, ioc: result.p1.player.ioc } : null}
        p2={result ? { id: result.p2.playerId, full_name: result.p2.player.fullName, ioc: result.p2.player.ioc } : null}
      />

      {!result ? (
        <p className="mt-20 text-center text-[15px] text-white/25">
          Select both players to see the prediction.
        </p>
      ) : (
        <div className="mt-16">
          {/* Headline: the two probabilities, as a single split bar. */}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[15px] tracking-tight text-white/60">
                {flagEmoji(result.p1.player.ioc)} {result.p1.player.fullName}
              </div>
              <div className="mt-1 text-[56px] font-semibold leading-none tracking-[-0.04em] text-white tabular-nums">
                {pct1}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-[15px] tracking-tight text-white/60">
                {result.p2.player.fullName} {flagEmoji(result.p2.player.ioc)}
              </div>
              <div className="mt-1 text-[56px] font-semibold leading-none tracking-[-0.04em] text-white/45 tabular-nums">
                {100 - pct1}%
              </div>
            </div>
          </div>

          <div className="mt-6 flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-white/[0.08]">
            <div className="rounded-full bg-white/85" style={{ width: `${pct1}%` }} />
            <div className="flex-1 rounded-full bg-white/25" />
          </div>

          <p className="mt-5 text-[15px] text-white/50">
            On {surface.toLowerCase()},{" "}
            <span className="text-white/90">
              {result.p1.winProb >= 0.5 ? result.p1.player.fullName : result.p2.player.fullName}
            </span>{" "}
            is favoured.
          </p>

          <div className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            <EloPanel side={result.p1} surface={surface} />
            <EloPanel side={result.p2} surface={surface} />
          </div>

          <div className="mt-14 border-t border-white/[0.08] pt-6">
            <div className="text-[11px] uppercase tracking-[0.08em] text-white/30">Head to head</div>
            <div className="mt-2 text-[28px] font-semibold tabular-nums tracking-tight text-white">
              {result.h2h.p1_wins}
              <span className="mx-2 text-white/25">–</span>
              {result.h2h.p2_wins}
            </div>
            <Link
              href={`/player/${result.p1.playerId}`}
              className="mt-2 inline-block text-[13px] text-white/35 transition-colors hover:text-white/70"
            >
              {result.p1.player.fullName}&apos;s profile →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

type Side = NonNullable<Awaited<ReturnType<typeof getPrediction>>>["p1"];

function EloPanel({ side, surface }: { side: Side; surface: string }) {
  return (
    <div>
      <Link
        href={`/player/${side.playerId}`}
        className="text-[17px] tracking-tight text-white transition-colors hover:text-white/70"
      >
        {flagEmoji(side.player.ioc)} {side.player.fullName}
      </Link>
      <dl className="mt-4">
        <Row label={`${surface} Elo`} value={String(side.blended)} strong />
        <Row label="Overall" value={side.elo.toFixed(0)} />
        <Row label={`${surface} only`} value={side.surfaceElo != null ? side.surfaceElo.toFixed(0) : "—"} />
        <Row label="Peak" value={side.peakElo != null ? side.peakElo.toFixed(0) : "—"} />
        <Row label="Matches" value={String(side.matches ?? 0)} />
      </dl>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/[0.06] py-2.5">
      <dt className="text-[14px] text-white/40">{label}</dt>
      <dd className={`tabular-nums tracking-tight ${strong ? "text-[17px] text-white" : "text-[15px] text-white/70"}`}>
        {value}
      </dd>
    </div>
  );
}
