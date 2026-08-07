import { NextRequest, NextResponse } from "next/server";
import { searchPlayers } from "@/lib/queries";

// The only client-driven endpoint left: the typeahead needs to query as the
// user types. Every page's own data is fetched server-side instead.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json({ players: await searchPlayers(q) });
}
