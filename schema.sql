-- GameSetMatch D1 schema. Applied by `npm run db:reset` before seeding.

DROP TABLE IF EXISTS meta;
DROP TABLE IF EXISTS rankings;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS players;

CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  hand TEXT,             -- R / L / U(nknown)
  dob INTEGER,           -- yyyymmdd
  ioc TEXT,              -- IOC country code, e.g. SUI
  height INTEGER         -- cm
);

CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tourney_id TEXT NOT NULL,      -- e.g. "2019-560"
  tourney_name TEXT NOT NULL,
  surface TEXT,                  -- Hard / Clay / Grass / Carpet
  draw_size INTEGER,
  tourney_level TEXT,            -- G=Slam, M=Masters, A=other tour, F=Finals, D=Davis Cup, O=Olympics
  tourney_date INTEGER NOT NULL, -- yyyymmdd (tournament start date)
  match_num INTEGER NOT NULL,
  winner_id INTEGER NOT NULL REFERENCES players(id),
  loser_id INTEGER NOT NULL REFERENCES players(id),
  score TEXT,
  best_of INTEGER,
  round TEXT,                    -- F, SF, QF, R16, R32, R64, R128, RR, BR
  minutes INTEGER,
  -- per-match serve stats (NULL for walkovers / unrecorded matches)
  w_ace INTEGER, w_df INTEGER, w_svpt INTEGER, w_1stIn INTEGER,
  w_1stWon INTEGER, w_2ndWon INTEGER, w_SvGms INTEGER, w_bpSaved INTEGER, w_bpFaced INTEGER,
  l_ace INTEGER, l_df INTEGER, l_svpt INTEGER, l_1stIn INTEGER,
  l_1stWon INTEGER, l_2ndWon INTEGER, l_SvGms INTEGER, l_bpSaved INTEGER, l_bpFaced INTEGER,
  winner_rank INTEGER, winner_rank_points INTEGER,
  loser_rank INTEGER, loser_rank_points INTEGER,
  -- ML performance ratings on a 0-10 scale, filled by ml/train_rating.py output
  winner_rating REAL,
  loser_rating REAL,
  UNIQUE (tourney_id, match_num)
);

CREATE INDEX idx_matches_winner ON matches (winner_id, tourney_date);
CREATE INDEX idx_matches_loser ON matches (loser_id, tourney_date);
CREATE INDEX idx_matches_date ON matches (tourney_date);

-- Weekly ranking snapshots (top 300, 2000+), for the leaderboard and rank sparklines.
CREATE TABLE rankings (
  ranking_date INTEGER NOT NULL,  -- yyyymmdd
  rank INTEGER NOT NULL,
  player_id INTEGER NOT NULL REFERENCES players(id),
  points INTEGER,
  PRIMARY KEY (ranking_date, rank, player_id)
);

CREATE INDEX idx_rankings_player ON rankings (player_id, ranking_date);
CREATE INDEX idx_rankings_date ON rankings (ranking_date, rank);

CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
