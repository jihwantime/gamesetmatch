import HeroStage from "@/components/HeroStage";
import { getLeaderboard } from "@/lib/queries";
import { connection } from "next/server";

export default async function Home() {
  // Query at request time so image builds don't need a running database.
  await connection();
  const board = await getLeaderboard();
  const current = board.live ?? { entries: board.entries, as_of: board.date };

  return <HeroStage top={current.entries.slice(0, 10)} asOf={current.as_of} />;
}
