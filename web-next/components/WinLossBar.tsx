// Thin single-fill bar on a recessive track; the numbers beside it do the
// precise work, the bar just gives shape to the comparison.
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
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[14px] tracking-tight text-white/70">{label}</span>
        <span className="text-[13px] tabular-nums text-white/45">
          {wins}–{losses}
          <span className="ml-2 text-white/80">{winPct.toFixed(0)}%</span>
        </span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-white/[0.08]"
        role="img"
        aria-label={`${label}: ${wins} wins, ${losses} losses`}
      >
        <div className="h-full rounded-full bg-white/70" style={{ width: `${winPct}%` }} />
      </div>
    </div>
  );
}
