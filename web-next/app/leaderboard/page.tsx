import RankTable from "@/components/RankTable";
import { getLeaderboard } from "@/lib/queries";
import { formatDate } from "@/lib/format";

// Regenerate hourly so the page reflects database updates instead of
// being frozen at build time.
export const revalidate = 3600;

export const metadata = {
  title: "ATP Rankings — GameSetMatch",
  description: "Current ATP top 20 plus the full top 100 archive snapshot, with ML form ratings.",
};

export default async function LeaderboardPage() {
  const { date, entries, live, updated } = await getLeaderboard();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-14">
        <h1 className="text-[40px] font-semibold leading-tight tracking-[-0.03em] text-fg">
          Rankings
        </h1>
        <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-fg/55">
          Form is a player&apos;s average performance rating over their last twenty matches.
          {updated && <> Updated weekly — last refreshed {updated}.</>}
        </p>
      </header>

      {live && (
        <section className="mb-16">
          <div className="mb-5 flex items-baseline gap-3">
            <h2 className="text-[22px] font-semibold tracking-tight text-fg">Live top 20</h2>
            <span className="text-[13px] text-fg/42">{formatDate(live.as_of)}</span>
          </div>
          <RankTable rows={live.entries} />
        </section>
      )}

      <section>
        <div className="mb-5 flex items-baseline gap-3">
          <h2 className="text-[22px] font-semibold tracking-tight text-fg">Top 100</h2>
          <span className="text-[13px] text-fg/42">
            archive snapshot · {formatDate(date)}
          </span>
        </div>
        <RankTable rows={entries} />
      </section>

      {live && (
        <p className="mt-10 max-w-xl text-[13px] leading-relaxed text-fg/40">
          The live board comes from Wikipedia&apos;s weekly ATP release; the full table comes
          from Jeff Sackmann&apos;s archive, which publishes snapshots a few weeks behind. They
          are kept separate because ranking points are a rolling 52-week total — blending two
          different weeks would produce an inconsistent table.
        </p>
      )}
    </div>
  );
}
