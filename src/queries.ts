// SQL helpers for the API. Every function takes the D1 binding and returns
// plain JSON-ready objects.

export type PlayerSummary = {
  id: number;
  full_name: string;
  ioc: string | null;
};

const MATCH_LIST_SELECT = `
  SELECT m.id, m.tourney_id, m.tourney_name, m.surface, m.tourney_level,
         m.tourney_date, m.round, m.score, m.best_of, m.minutes,
         CASE WHEN m.winner_id = ?1 THEN 'W' ELSE 'L' END AS result,
         CASE WHEN m.winner_id = ?1 THEN m.loser_id ELSE m.winner_id END AS opponent_id,
         op.full_name AS opponent_name, op.ioc AS opponent_ioc,
         CASE WHEN m.winner_id = ?1 THEN m.winner_rank ELSE m.loser_rank END AS player_rank,
         CASE WHEN m.winner_id = ?1 THEN m.loser_rank ELSE m.winner_rank END AS opponent_rank,
         CASE WHEN m.winner_id = ?1 THEN m.winner_rating ELSE m.loser_rating END AS rating,
         CASE WHEN m.winner_id = ?1 THEN m.loser_rating ELSE m.winner_rating END AS opponent_rating
  FROM matches m
  JOIN players op ON op.id = CASE WHEN m.winner_id = ?1 THEN m.loser_id ELSE m.winner_id END
`;

export async function searchPlayers(db: D1Database, q: string) {
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const prefix = `${q.replace(/[%_]/g, "")}%`;
  const { results } = await db
    .prepare(
      `WITH candidates AS (
         SELECT id, full_name, last_name, ioc FROM players
         WHERE full_name LIKE ?1 COLLATE NOCASE
         LIMIT 200
       )
       SELECT c.id, c.full_name, c.ioc,
              (SELECT COUNT(*) FROM matches WHERE winner_id = c.id OR loser_id = c.id) AS total_matches
       FROM candidates c
       ORDER BY (c.full_name LIKE ?2 COLLATE NOCASE OR c.last_name LIKE ?2 COLLATE NOCASE) DESC,
                total_matches DESC
       LIMIT 10`
    )
    .bind(like, prefix)
    .all();
  return results;
}

export async function getPlayerProfile(db: D1Database, id: number) {
  const player = await db.prepare(`SELECT * FROM players WHERE id = ?1`).bind(id).first();
  if (!player) return null;

  const stats = await db
    .prepare(
      `SELECT
         SUM(winner_id = ?1) AS wins,
         SUM(loser_id = ?1) AS losses,
         SUM(winner_id = ?1 AND round = 'F' AND tourney_level != 'D') AS titles,
         AVG(CASE WHEN winner_id = ?1 THEN winner_rating ELSE loser_rating END) AS avg_rating,
         MIN(tourney_date) AS first_match,
         MAX(tourney_date) AS last_match
       FROM matches WHERE winner_id = ?1 OR loser_id = ?1`
    )
    .bind(id)
    .first();

  const surfaces = await db
    .prepare(
      `SELECT surface,
              SUM(winner_id = ?1) AS wins,
              SUM(loser_id = ?1) AS losses
       FROM matches
       WHERE (winner_id = ?1 OR loser_id = ?1) AND surface IS NOT NULL
       GROUP BY surface ORDER BY wins + losses DESC`
    )
    .bind(id)
    .all();

  const rank = await db
    .prepare(
      `SELECT
         (SELECT rank FROM rankings WHERE player_id = ?1
          ORDER BY ranking_date DESC LIMIT 1) AS latest_rank,
         (SELECT MAX(ranking_date) FROM rankings WHERE player_id = ?1) AS latest_rank_date,
         (SELECT MIN(rank) FROM rankings WHERE player_id = ?1) AS best_rank`
    )
    .bind(id)
    .first();

  return { ...player, ...stats, ...rank, surfaces: surfaces.results };
}

export async function getPlayerMatches(
  db: D1Database,
  id: number,
  opts: { page: number; pageSize: number; surface?: string; year?: number }
) {
  const filters: string[] = ["(m.winner_id = ?1 OR m.loser_id = ?1)"];
  const binds: unknown[] = [id];
  if (opts.surface) {
    binds.push(opts.surface);
    filters.push(`m.surface = ?${binds.length}`);
  }
  if (opts.year) {
    binds.push(opts.year * 10000, opts.year * 10000 + 1231);
    filters.push(`m.tourney_date BETWEEN ?${binds.length - 1} AND ?${binds.length}`);
  }
  const where = filters.join(" AND ");

  const total = await db
    .prepare(`SELECT COUNT(*) AS n FROM matches m WHERE ${where}`)
    .bind(...binds)
    .first<{ n: number }>();

  const offset = (opts.page - 1) * opts.pageSize;
  const { results } = await db
    .prepare(
      `${MATCH_LIST_SELECT} WHERE ${where}
       ORDER BY m.tourney_date DESC, m.tourney_id DESC, m.match_num DESC
       LIMIT ${opts.pageSize} OFFSET ${offset}`
    )
    .bind(...binds)
    .all();

  return { total: total?.n ?? 0, page: opts.page, pageSize: opts.pageSize, matches: results };
}

export async function getRankHistory(db: D1Database, id: number) {
  const { results } = await db
    .prepare(
      `SELECT ranking_date, rank, points FROM rankings
       WHERE player_id = ?1 ORDER BY ranking_date`
    )
    .bind(id)
    .all();
  return results;
}

export async function getMatch(db: D1Database, id: number) {
  return db
    .prepare(
      `SELECT m.*,
              w.full_name AS winner_name, w.ioc AS winner_ioc,
              l.full_name AS loser_name, l.ioc AS loser_ioc
       FROM matches m
       JOIN players w ON w.id = m.winner_id
       JOIN players l ON l.id = m.loser_id
       WHERE m.id = ?1`
    )
    .bind(id)
    .first();
}

export async function getLeaderboard(db: D1Database, date?: number) {
  const snapshot =
    date ??
    (
      await db
        .prepare(`SELECT MAX(ranking_date) AS d FROM rankings`)
        .first<{ d: number }>()
    )?.d;
  if (!snapshot) return { date: null, entries: [] };

  const { results } = await db
    .prepare(
      `SELECT r.rank, r.points, p.id, p.full_name, p.ioc,
              (SELECT AVG(CASE WHEN winner_id = p.id THEN winner_rating ELSE loser_rating END)
               FROM matches WHERE winner_id = p.id OR loser_id = p.id) AS avg_rating
       FROM rankings r JOIN players p ON p.id = r.player_id
       WHERE r.ranking_date = ?1
       ORDER BY r.rank LIMIT 100`
    )
    .bind(snapshot)
    .all();
  return { date: snapshot, entries: results };
}

export async function getHeadToHead(db: D1Database, id1: number, id2: number) {
  const players = await db
    .prepare(`SELECT id, full_name, ioc FROM players WHERE id IN (?1, ?2)`)
    .bind(id1, id2)
    .all<PlayerSummary>();
  if (players.results.length < 2) return null;

  const record = await db
    .prepare(
      `SELECT SUM(winner_id = ?1) AS p1_wins, SUM(winner_id = ?2) AS p2_wins
       FROM matches
       WHERE (winner_id = ?1 AND loser_id = ?2) OR (winner_id = ?2 AND loser_id = ?1)`
    )
    .bind(id1, id2)
    .first();

  const { results: matches } = await db
    .prepare(
      `${MATCH_LIST_SELECT}
       WHERE (m.winner_id = ?1 AND m.loser_id = ?2) OR (m.winner_id = ?2 AND m.loser_id = ?1)
       ORDER BY m.tourney_date DESC, m.match_num DESC`
    )
    .bind(id1, id2)
    .all();

  return {
    p1: players.results.find((p) => p.id === id1),
    p2: players.results.find((p) => p.id === id2),
    p1_wins: (record as { p1_wins: number } | null)?.p1_wins ?? 0,
    p2_wins: (record as { p2_wins: number } | null)?.p2_wins ?? 0,
    matches,
  };
}
