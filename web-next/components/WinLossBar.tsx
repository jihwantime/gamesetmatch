import { WIN_COLOR } from "@/lib/format";

export default function WinLossBar({
  label,
  wins,
  losses,
}: {
  label: string;
  wins: number;
  losses: number;
}) {
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
