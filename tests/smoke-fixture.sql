-- Small deterministic dataset for an isolated CI database only.
INSERT INTO players (id, first_name, last_name, full_name, ioc) VALUES
  (103819, 'Roger', 'Federer', 'Roger Federer', 'SUI'),
  (104745, 'Rafael', 'Nadal', 'Rafael Nadal', 'ESP');
INSERT INTO rankings (ranking_date, rank, player_id, points) VALUES
  (20261005, 1, 103819, 10000), (20261005, 2, 104745, 9000);
INSERT INTO live_rankings (rank, player_id, points, as_of) VALUES
  (1, 103819, 10000, 20261005), (2, 104745, 9000, 20261005);
INSERT INTO matches (id, tourney_id, tourney_name, tourney_date, match_num,
  winner_id, loser_id, score, best_of, round, surface, tourney_level,
  w_svpt, l_svpt, w_1st_in, l_1st_in, winner_rating, loser_rating) VALUES
  (1, 'ci-test', 'CI Open', 20261005, 1, 103819, 104745, '6-4 6-4', 3, 'F', 'Hard', 'A',
  50, 48, 30, 28, 8.0, 4.0);
INSERT INTO player_elo (player_id, elo, elo_hard, elo_clay, elo_grass) VALUES
  (103819, 2200, 2250, 2000, 2300), (104745, 2150, 2100, 2400, 2050);
INSERT INTO meta (key, value) VALUES ('build_date', '2026-10-05'), ('latest_match', '20261005');
