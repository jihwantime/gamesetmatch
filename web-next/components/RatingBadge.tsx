// Quiet by default: the number carries the meaning, colour only marks the
// extremes so a table of ratings doesn't turn into a traffic light.
export default function RatingBadge({
  rating,
  size = "md",
}: {
  rating: number | null;
  size?: "md" | "lg";
}) {
  if (rating == null) {
    return <span className={`tabular-nums text-white/25 ${size === "lg" ? "text-2xl" : "text-[15px]"}`}>—</span>;
  }
  const tone =
    rating >= 8.5 ? "text-win"
    : rating >= 7 ? "text-white"
    : rating >= 5 ? "text-white/75"
    : rating >= 3.5 ? "text-white/45"
    : "text-loss/80";
  return (
    <span
      title="ML performance rating (0–10)"
      className={`tabular-nums tracking-tight ${tone} ${
        size === "lg" ? "text-[32px] font-semibold" : "text-[15px] font-medium"
      }`}
    >
      {rating.toFixed(1)}
    </span>
  );
}
