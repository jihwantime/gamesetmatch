// Typed fetch helpers for the Worker API.

export type SearchPlayer = {
  id: number;
  full_name: string;
  ioc: string | null;
  total_matches: number;
};

export type SurfaceSplit = { surface: string; wins: number; losses: number };

export type Profile = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  hand: string | null;
  dob: number | null;
  ioc: string | null;
  height: number | null;
  wins: number;
  losses: number;
  titles: number;
  avg_rating: number | null;
  first_match: number | null;
  last_match: number | null;
  latest_rank: number | null;
  latest_rank_date: number | null;
  best_rank: number | null;
  surfaces: SurfaceSplit[];
};

export type MatchListItem = {
  id: number;
  tourney_id: string;
  tourney_name: string;
  surface: string | null;
  tourney_level: string | null;
  tourney_date: number;
  round: string;
  score: string | null;
  best_of: number | null;
  minutes: number | null;
  result: "W" | "L";
  opponent_id: number;
  opponent_name: string;
  opponent_ioc: string | null;
  player_rank: number | null;
  opponent_rank: number | null;
  rating: number | null;
  opponent_rating: number | null;
};

export type MatchPage = {
  total: number;
  page: number;
  pageSize: number;
  matches: MatchListItem[];
};

export type RankPoint = { ranking_date: number; rank: number; points: number | null };

export type MatchDetail = {
  id: number;
  tourney_name: string;
  surface: string | null;
  tourney_level: string | null;
  tourney_date: number;
  round: string;
  score: string | null;
  best_of: number | null;
  minutes: number | null;
  winner_id: number;
  loser_id: number;
  winner_name: string;
  winner_ioc: string | null;
  loser_name: string;
  loser_ioc: string | null;
  winner_rank: number | null;
  loser_rank: number | null;
  winner_rating: number | null;
  loser_rating: number | null;
  w_ace: number | null; w_df: number | null; w_svpt: number | null;
  w_1stIn: number | null; w_1stWon: number | null; w_2ndWon: number | null;
  w_SvGms: number | null; w_bpSaved: number | null; w_bpFaced: number | null;
  l_ace: number | null; l_df: number | null; l_svpt: number | null;
  l_1stIn: number | null; l_1stWon: number | null; l_2ndWon: number | null;
  l_SvGms: number | null; l_bpSaved: number | null; l_bpFaced: number | null;
};

export type LeaderboardEntry = {
  rank: number;
  points: number | null;
  id: number;
  full_name: string;
  ioc: string | null;
  avg_rating: number | null;
};

export type H2H = {
  p1: SearchPlayer;
  p2: SearchPlayer;
  p1_wins: number;
  p2_wins: number;
  matches: MatchListItem[];
};

export type PredictSide = {
  player_id: number;
  full_name: string;
  ioc: string | null;
  elo: number;
  elo_hard: number | null;
  elo_clay: number | null;
  elo_grass: number | null;
  elo_carpet: number | null;
  matches: number | null;
  peak_elo: number | null;
  surface_rating: number;
  win_prob: number;
};

export type Prediction = {
  surface: string;
  p1: PredictSide;
  p2: PredictSide;
  h2h: { p1_wins: number; p2_wins: number };
};

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  search: (q: string) =>
    get<{ players: SearchPlayer[] }>(`/api/search?q=${encodeURIComponent(q)}`),
  player: (id: number | string) => get<Profile>(`/api/players/${id}`),
  playerMatches: (id: number | string, page: number, surface?: string, year?: number) => {
    const p = new URLSearchParams({ page: String(page) });
    if (surface) p.set("surface", surface);
    if (year) p.set("year", String(year));
    return get<MatchPage>(`/api/players/${id}/matches?${p}`);
  },
  rankHistory: (id: number | string) =>
    get<{ history: RankPoint[] }>(`/api/players/${id}/rank-history`),
  match: (id: number | string) => get<MatchDetail>(`/api/matches/${id}`),
  leaderboard: () => get<{ date: number | null; entries: LeaderboardEntry[] }>("/api/leaderboard"),
  h2h: (id1: number, id2: number) => get<H2H>(`/api/h2h/${id1}/${id2}`),
  predict: (p1: number, p2: number, surface?: string) => {
    const q = new URLSearchParams({ p1: String(p1), p2: String(p2) });
    if (surface) q.set("surface", surface);
    return get<Prediction>(`/api/predict?${q}`);
  },
};
