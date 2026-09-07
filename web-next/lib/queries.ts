import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// Prisma's fluent API covers the simple lookups; the analytical queries (a
// player's rating over their last 20 matches, head-to-head aggregates) are
// clearer and faster as raw SQL, which Prisma parameterises safely via tagged
// templates.

/** Average performance rating over a player's most recent 20 rated matches. */
const FORM_L20 = Prisma.sql`
  (SELECT AVG(rating)::float FROM (
     SELECT CASE WHEN m.winner_id = p.id THEN m.winner_rating ELSE m.loser_rating END AS rating
     FROM matches m
     WHERE (m.winner_id = p.id OR m.loser_id = p.id)
       AND (CASE WHEN m.winner_id = p.id THEN m.winner_rating ELSE m.loser_rating END) IS NOT NULL
     ORDER BY m.tourney_date DESC, m.match_num DESC
     LIMIT 20
   ) recent)`;

export type BoardRow = {
  rank: number;
  points: number | null;
  id: number;
  full_name: string;
  ioc: string | null;
  avg_rating: number | null;
};

export async function getLeaderboard() {
  const snapshotRow = await prisma.ranking.aggregate({ _max: { rankingDate: true } });
  const snapshot = snapshotRow._max.rankingDate;
  if (!snapshot) return { date: null, entries: [], live: null, updated: null };

  const entries = await prisma.$queryRaw<BoardRow[]>`
    SELECT r.rank, r.points, p.id, p.full_name, p.ioc, ${FORM_L20} AS avg_rating
    FROM rankings r JOIN players p ON p.id = r.player_id
    WHERE r.ranking_date = ${snapshot}
    ORDER BY r.rank LIMIT 100`;

  const live = await prisma.$queryRaw<(BoardRow & { as_of: number })[]>`
    SELECT l.rank, l.points, l.as_of, p.id, p.full_name, p.ioc, ${FORM_L20} AS avg_rating
    FROM live_rankings l JOIN players p ON p.id = l.player_id
    ORDER BY l.rank`;

  const buildDate = await prisma.meta.findUnique({ where: { key: "build_date" } });

  return {
    date: snapshot,
    entries,
    live: live.length ? { as_of: live[0].as_of, entries: live } : null,
    updated: buildDate?.value ?? null,
  };
}

export async function searchPlayers(q: string) {
  const term = q.replace(/[%_]/g, "");
  if (term.length < 2) return [];
  return prisma.$queryRaw<{ id: number; full_name: string; ioc: string | null; total_matches: number }[]>`
    WITH candidates AS (
      SELECT id, full_name, last_name, ioc FROM players
      WHERE full_name ILIKE ${"%" + term + "%"} LIMIT 200
    )
    SELECT c.id, c.full_name, c.ioc,
           (SELECT COUNT(*)::int FROM matches WHERE winner_id = c.id OR loser_id = c.id) AS total_matches
    FROM candidates c
    ORDER BY (c.full_name ILIKE ${term + "%"} OR c.last_name ILIKE ${term + "%"}) DESC, total_matches DESC
    LIMIT 10`;
}

export async function getPlayerProfile(id: number) {
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) return null;

  const [stats] = await prisma.$queryRaw<{
    wins: number; losses: number; titles: number; avg_rating: number | null;
    first_match: number | null; last_match: number | null;
  }[]>`
    SELECT COUNT(*) FILTER (WHERE winner_id = ${id})::int AS wins,
           COUNT(*) FILTER (WHERE loser_id = ${id})::int AS losses,
           COUNT(*) FILTER (WHERE winner_id = ${id} AND round = 'F' AND tourney_level <> 'D')::int AS titles,
           AVG(CASE WHEN winner_id = ${id} THEN winner_rating ELSE loser_rating END)::float AS avg_rating,
           MIN(tourney_date)::int AS first_match, MAX(tourney_date)::int AS last_match
    FROM matches WHERE winner_id = ${id} OR loser_id = ${id}`;

  const surfaces = await prisma.$queryRaw<{ surface: string; wins: number; losses: number }[]>`
    SELECT surface,
           COUNT(*) FILTER (WHERE winner_id = ${id})::int AS wins,
           COUNT(*) FILTER (WHERE loser_id = ${id})::int AS losses
    FROM matches
    WHERE (winner_id = ${id} OR loser_id = ${id}) AND surface IS NOT NULL
    GROUP BY surface ORDER BY COUNT(*) DESC`;

  const [rank] = await prisma.$queryRaw<{
    latest_rank: number | null; latest_rank_date: number | null; best_rank: number | null;
  }[]>`
    SELECT (SELECT rank FROM rankings WHERE player_id = ${id} ORDER BY ranking_date DESC LIMIT 1) AS latest_rank,
           (SELECT MAX(ranking_date) FROM rankings WHERE player_id = ${id}) AS latest_rank_date,
           (SELECT MIN(rank) FROM rankings WHERE player_id = ${id}) AS best_rank`;

  return { ...player, ...stats, ...rank, surfaces };
}

export type MatchListItem = {
  id: number;
  tourney_name: string;
  surface: string | null;
  tourney_level: string | null;
  tourney_date: number;
  round: string | null;
  score: string | null;
  minutes: number | null;
  result: "W" | "L";
  opponent_id: number;
  opponent_name: string;
  opponent_ioc: string | null;
  opponent_rank: number | null;
  rating: number | null;
};

export async function getPlayerMatches(
  id: number,
  { page = 1, surface, year }: { page?: number; surface?: string; year?: number }
) {
  const pageSize = 20;
  const filters = [Prisma.sql`(m.winner_id = ${id} OR m.loser_id = ${id})`];
  if (surface) filters.push(Prisma.sql`m.surface = ${surface}`);
  if (year) filters.push(Prisma.sql`m.tourney_date BETWEEN ${year * 10000} AND ${year * 10000 + 1231}`);
  const where = Prisma.join(filters, " AND ");

  const [{ count }] = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM matches m WHERE ${where}`;

  const matches = await prisma.$queryRaw<MatchListItem[]>`
    SELECT m.id, m.tourney_name, m.surface, m.tourney_level, m.tourney_date, m.round,
           m.score, m.minutes,
           CASE WHEN m.winner_id = ${id} THEN 'W' ELSE 'L' END AS result,
           CASE WHEN m.winner_id = ${id} THEN m.loser_id ELSE m.winner_id END AS opponent_id,
           op.full_name AS opponent_name, op.ioc AS opponent_ioc,
           CASE WHEN m.winner_id = ${id} THEN m.loser_rank ELSE m.winner_rank END AS opponent_rank,
           CASE WHEN m.winner_id = ${id} THEN m.winner_rating ELSE m.loser_rating END AS rating
    FROM matches m
    JOIN players op ON op.id = CASE WHEN m.winner_id = ${id} THEN m.loser_id ELSE m.winner_id END
    WHERE ${where}
    ORDER BY m.tourney_date DESC, m.tourney_id DESC, m.match_num DESC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;

  return { total: count, page, pageSize, matches };
}

export async function getRankHistory(id: number) {
  return prisma.$queryRaw<{ ranking_date: number; rank: number; points: number | null }[]>`
    SELECT ranking_date, rank, points FROM rankings
    WHERE player_id = ${id} ORDER BY ranking_date`;
}

export async function getMatch(id: number) {
  const [match] = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT m.*, w.full_name AS winner_name, w.ioc AS winner_ioc,
           l.full_name AS loser_name, l.ioc AS loser_ioc
    FROM matches m
    JOIN players w ON w.id = m.winner_id
    JOIN players l ON l.id = m.loser_id
    WHERE m.id = ${id}`;
  return match ?? null;
}

export async function getHeadToHead(id1: number, id2: number) {
  const [record] = await prisma.$queryRaw<{ p1_wins: number; p2_wins: number }[]>`
    SELECT COUNT(*) FILTER (WHERE winner_id = ${id1})::int AS p1_wins,
           COUNT(*) FILTER (WHERE winner_id = ${id2})::int AS p2_wins
    FROM matches
    WHERE (winner_id = ${id1} AND loser_id = ${id2}) OR (winner_id = ${id2} AND loser_id = ${id1})`;
  return record ?? { p1_wins: 0, p2_wins: 0 };
}

const SURFACE_WEIGHT = 0.6; // must match ml/train_elo.py

export async function getPrediction(id1: number, id2: number, surface: string | null) {
  const rows = await prisma.playerElo.findMany({
    where: { playerId: { in: [id1, id2] } },
    include: { player: true },
  });
  const e1 = rows.find((r) => r.playerId === id1);
  const e2 = rows.find((r) => r.playerId === id2);
  if (!e1 || !e2) return null;

  const surfaceElo = (e: typeof e1) =>
    surface === "Hard" ? e.eloHard
    : surface === "Clay" ? e.eloClay
    : surface === "Grass" ? e.eloGrass
    : null;

  // blend surface-specific and overall Elo so thin surface samples stay sane
  const blended = (e: typeof e1) => {
    const s = surfaceElo(e);
    return s == null ? e.elo : SURFACE_WEIGHT * s + (1 - SURFACE_WEIGHT) * e.elo;
  };

  const r1 = blended(e1);
  const r2 = blended(e2);
  const prob1 = 1 / (1 + 10 ** ((r2 - r1) / 400));
  const h2h = await getHeadToHead(id1, id2);

  return {
    surface: surface ?? "all",
    p1: { ...e1, surfaceElo: surfaceElo(e1), blended: Math.round(r1), winProb: prob1 },
    p2: { ...e2, surfaceElo: surfaceElo(e2), blended: Math.round(r2), winProb: 1 - prob1 },
    h2h,
  };
}
