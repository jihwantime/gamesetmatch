import HeroStage from "@/components/HeroStage";
import { getLeaderboard } from "@/lib/queries";

// Regenerate hourly so the page reflects database updates instead of
// being frozen at build time.
export const revalidate = 3600;

export default async function Home() {
  const board = await getLeaderboard();
  const current = board.live ?? { entries: board.entries, as_of: board.date };

  return <HeroStage top={current.entries.slice(0, 10)} asOf={current.as_of} />;
}
