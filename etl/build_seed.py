"""Transform the raw Sackmann CSVs into batched INSERT statements for D1.

Reads etl/data/ (created by download.py), writes numbered .sql files to
etl/out/ which `npm run db:reset` applies in order. If ml/out/ratings.csv
exists (produced by ml/train_rating.py), per-match ratings are joined into
the matches seed; otherwise the rating columns stay NULL.
"""

from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).parent.parent
DATA = ROOT / "etl" / "data"
OUT = ROOT / "etl" / "out"
RATINGS_CSV = ROOT / "ml" / "out" / "ratings.csv"

YEARS = range(2000, 2027)
MAX_RANK = 300          # rankings kept per week (leaderboard + sparklines)
ROWS_PER_INSERT = 250  # keep each INSERT under SQLite's max statement length
ROWS_PER_FILE = 100_000

MATCH_COLS = [
    "tourney_id", "tourney_name", "surface", "draw_size", "tourney_level",
    "tourney_date", "match_num", "winner_id", "loser_id", "score", "best_of",
    "round", "minutes",
    "w_ace", "w_df", "w_svpt", "w_1stIn", "w_1stWon", "w_2ndWon", "w_SvGms",
    "w_bpSaved", "w_bpFaced",
    "l_ace", "l_df", "l_svpt", "l_1stIn", "l_1stWon", "l_2ndWon", "l_SvGms",
    "l_bpSaved", "l_bpFaced",
    "winner_rank", "winner_rank_points", "loser_rank", "loser_rank_points",
    "winner_rating", "loser_rating",
]

INT_MATCH_COLS = [
    c for c in MATCH_COLS
    if c not in ("tourney_id", "tourney_name", "surface", "tourney_level",
                 "score", "round", "winner_rating", "loser_rating")
]


def sql_literal(v) -> str:
    if v is None or (isinstance(v, float) and np.isnan(v)) or v is pd.NA:
        return "NULL"
    if isinstance(v, str):
        return "'" + v.replace("'", "''") + "'"
    if isinstance(v, float):
        return f"{v:g}"
    return str(int(v))


def write_inserts(table: str, columns: list[str], rows: list[tuple], stem: str) -> None:
    """Write batched multi-row INSERTs, split across files of ROWS_PER_FILE rows."""
    for file_no, file_start in enumerate(range(0, len(rows), ROWS_PER_FILE)):
        chunk = rows[file_start : file_start + ROWS_PER_FILE]
        path = OUT / f"{stem}_{file_no:02d}.sql"
        with path.open("w") as f:
            for start in range(0, len(chunk), ROWS_PER_INSERT):
                batch = chunk[start : start + ROWS_PER_INSERT]
                values = ",\n".join(
                    "(" + ",".join(sql_literal(v) for v in row) + ")" for row in batch
                )
                f.write(
                    f"INSERT INTO {table} ({','.join(columns)}) VALUES\n{values};\n"
                )
        print(f"wrote {path.name}: {len(chunk)} rows")


def load_matches() -> pd.DataFrame:
    frames = [pd.read_csv(DATA / f"atp_matches_{y}.csv", low_memory=False) for y in YEARS]
    recent = DATA / "recent_matches.csv"  # tennis-data.co.uk top-up from fetch_recent.py
    if recent.exists():
        frames.append(pd.read_csv(recent, low_memory=False))
        print(f"including {recent.name}: {len(frames[-1])} current-season matches")
    df = pd.concat(frames, ignore_index=True)

    if RATINGS_CSV.exists():
        ratings = pd.read_csv(RATINGS_CSV)
        winner = ratings.rename(columns={"player_id": "winner_id", "rating": "winner_rating"})
        loser = ratings.rename(columns={"player_id": "loser_id", "rating": "loser_rating"})
        df = df.merge(winner, on=["tourney_id", "match_num", "winner_id"], how="left")
        df = df.merge(loser, on=["tourney_id", "match_num", "loser_id"], how="left")
        rated = df["winner_rating"].notna().sum()
        print(f"joined ratings: {rated}/{len(df)} matches rated")
    else:
        df["winner_rating"] = np.nan
        df["loser_rating"] = np.nan
        print("no ml/out/ratings.csv — rating columns left NULL")

    for c in INT_MATCH_COLS:
        df[c] = pd.to_numeric(df[c], errors="coerce").astype("Int64")

    df = df.sort_values(["tourney_date", "tourney_id", "match_num"])
    df = df.drop_duplicates(subset=["tourney_id", "match_num"], keep="first")
    return df[MATCH_COLS]


def load_players(player_ids: set[int]) -> pd.DataFrame:
    df = pd.read_csv(DATA / "atp_players.csv", low_memory=False)
    df = df[df["player_id"].isin(player_ids)].copy()
    df["name_first"] = df["name_first"].fillna("")
    df["name_last"] = df["name_last"].fillna("")
    df["full_name"] = (df["name_first"] + " " + df["name_last"]).str.strip()
    for c in ("dob", "height"):
        df[c] = pd.to_numeric(df[c], errors="coerce").astype("Int64")
    return df[["player_id", "name_first", "name_last", "full_name", "hand", "dob", "ioc", "height"]]


def load_rankings(player_ids: set[int]) -> pd.DataFrame:
    frames = [
        pd.read_csv(DATA / f"atp_rankings_{d}.csv", low_memory=False)
        for d in ("00s", "10s", "20s", "current")
    ]
    df = pd.concat(frames, ignore_index=True)
    for c in ("ranking_date", "rank", "player", "points"):
        df[c] = pd.to_numeric(df[c], errors="coerce").astype("Int64")
    df = df[
        (df["ranking_date"] >= 20000101)
        & (df["rank"] <= MAX_RANK)
        & (df["player"].isin(player_ids))
    ]
    df = df.drop_duplicates(subset=["ranking_date", "rank", "player"])
    df = df.sort_values(["ranking_date", "rank"])
    return df[["ranking_date", "rank", "player", "points"]]


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for old in OUT.glob("*.sql"):
        old.unlink()

    matches = load_matches()
    player_ids = set(matches["winner_id"].dropna()) | set(matches["loser_id"].dropna())
    players = load_players(player_ids)
    rankings = load_rankings(player_ids)

    print(f"{len(matches)} matches, {len(players)} players, {len(rankings)} ranking rows")

    write_inserts(
        "players",
        ["id", "first_name", "last_name", "full_name", "hand", "dob", "ioc", "height"],
        list(players.itertuples(index=False, name=None)),
        "00_players",
    )
    write_inserts("matches", MATCH_COLS, list(matches.itertuples(index=False, name=None)), "01_matches")
    write_inserts(
        "rankings",
        ["ranking_date", "rank", "player_id", "points"],
        list(rankings.itertuples(index=False, name=None)),
        "02_rankings",
    )

    meta = [
        ("dataset", "Aneeshers/tennis-sackmann-archive (atp, 2000-2025)"),
        ("build_date", date.today().isoformat()),
        ("ratings", "yes" if RATINGS_CSV.exists() else "no"),
    ]
    write_inserts("meta", ["key", "value"], meta, "03_meta")


if __name__ == "__main__":
    main()
