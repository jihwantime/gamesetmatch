import Link from "next/link";
import RatingBadge from "./RatingBadge";
import type { BoardRow } from "@/lib/queries";
import { flagEmoji } from "@/lib/format";

// Hairline rows rather than a boxed table: the data is the object, the
// container shouldn't compete with it.
export default function RankTable({ rows, showForm = true }: { rows: BoardRow[]; showForm?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-4 border-b border-fg/[0.12] pb-2 text-[11px] uppercase tracking-[0.08em] text-fg/40">
        <span className="w-6 text-right">#</span>
        <span className="flex-1">Player</span>
        <span className="w-20 text-right">Points</span>
        {showForm && <span className="w-12 text-right">Form</span>}
      </div>
      <ol>
        {rows.map((e) => (
          <li key={e.id}>
            <Link
              href={`/player/${e.id}`}
              className="group flex items-center gap-4 border-b border-fg/[0.09] py-3 transition-colors hover:border-fg/30"
            >
              <span className="w-6 text-right text-[13px] tabular-nums text-fg/40">{e.rank}</span>
              <span className="flex flex-1 items-center gap-2.5 truncate">
                <span className="text-[14px]">{flagEmoji(e.ioc)}</span>
                <span className="truncate text-[15px] tracking-tight text-fg/85 transition-colors group-hover:text-fg">
                  {e.full_name}
                </span>
              </span>
              <span className="w-20 text-right text-[14px] tabular-nums text-fg/55">
                {e.points?.toLocaleString() ?? "—"}
              </span>
              {showForm && (
                <span className="w-12 text-right">
                  <RatingBadge rating={e.avg_rating} />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
