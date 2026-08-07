import { ratingTier } from "@/lib/format";

export default function RatingBadge({
  rating,
  size = "md",
}: {
  rating: number | null;
  size?: "md" | "lg";
}) {
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
