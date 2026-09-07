"""Bulk-load the GameSetMatch dataset into PostgreSQL.

Same inputs as build_seed.py (the Sackmann archive + tennis-data top-up + model
outputs), but loaded straight into Postgres with COPY instead of emitting SQL
INSERT batches for D1. COPY is dramatically faster for ~80k matches and ~370k
ranking rows.

Usage:
    DATABASE_URL=postgresql://user@localhost:5432/gamesetmatch \
        python etl/load_postgres.py
"""

import io
import os
import sys
from datetime import date
from pathlib import Path

import pandas as pd
import psycopg

sys.path.insert(0, str(Path(__file__).parent))

from build_seed import (  # noqa: E402  (shares the exact cleaning logic)
    ELO_CSV,
    LIVE_RANKINGS_CSV,
    load_matches,
    load_players,
    load_rankings,
)

# Prisma maps w_1stIn -> w_1st_in etc, so the Postgres column names differ
# slightly from the D1 ones.
MATCH_COLUMNS = {
    "w_1stIn": "w_1st_in", "w_1stWon": "w_1st_won", "w_2ndWon": "w_2nd_won",
    "w_SvGms": "w_sv_gms", "w_bpSaved": "w_bp_saved", "w_bpFaced": "w_bp_faced",
    "l_1stIn": "l_1st_in", "l_1stWon": "l_1st_won", "l_2ndWon": "l_2nd_won",
    "l_SvGms": "l_sv_gms", "l_bpSaved": "l_bp_saved", "l_bpFaced": "l_bp_faced",
}


def copy_df(cur, table: str, df: pd.DataFrame) -> None:
    """Stream a dataframe into Postgres via COPY ... FROM STDIN (CSV)."""
    buf = io.StringIO()
    df.to_csv(buf, index=False, header=False, na_rep="")
    buf.seek(0)
    cols = ",".join(f'"{c}"' for c in df.columns)
    with cur.copy(f"COPY {table} ({cols}) FROM STDIN WITH (FORMAT csv, NULL '')") as copy:
        while chunk := buf.read(1 << 20):
            copy.write(chunk)
    print(f"  {table}: {len(df):,} rows")


def main() -> None:
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("set DATABASE_URL, e.g. postgresql://you@localhost:5432/gamesetmatch")
    # Drop Prisma's ?schema= (psycopg rejects it) but keep everything else —
    # hosted Postgres like Neon requires sslmode/channel_binding to connect.
    if "?" in url:
        base, _, query = url.partition("?")
        kept = [p for p in query.split("&") if p and not p.startswith("schema=")]
        url = base + ("?" + "&".join(kept) if kept else "")

    matches = load_matches()
    player_ids = set(matches["winner_id"].dropna()) | set(matches["loser_id"].dropna())
    players = load_players(player_ids)
    rankings = load_rankings(player_ids)

    players.columns = ["id", "first_name", "last_name", "full_name", "hand", "dob", "ioc", "height"]
    rankings.columns = ["ranking_date", "rank", "player_id", "points"]
    matches = matches.rename(columns=MATCH_COLUMNS)
    matches.insert(0, "id", range(1, len(matches) + 1))

    with psycopg.connect(url) as conn, conn.cursor() as cur:
        print("truncating…")
        cur.execute(
            "TRUNCATE matches, rankings, live_rankings, player_elo, meta, players RESTART IDENTITY CASCADE"
        )

        print("loading…")
        copy_df(cur, "players", players)
        copy_df(cur, "matches", matches)
        copy_df(cur, "rankings", rankings)

        if ELO_CSV.exists():
            elo = pd.read_csv(ELO_CSV)
            elo = elo[elo["player_id"].isin(player_ids)]
            elo.columns = ["player_id", "elo", "elo_hard", "elo_clay", "elo_grass",
                           "elo_carpet", "matches", "peak_elo"]
            copy_df(cur, "player_elo", elo)

        if LIVE_RANKINGS_CSV.exists():
            live = pd.read_csv(LIVE_RANKINGS_CSV)
            live = live[live["player_id"].isin(player_ids)]
            copy_df(cur, "live_rankings", live[["rank", "player_id", "points", "as_of"]])

        meta = pd.DataFrame([
            ("dataset", "Aneeshers/tennis-sackmann-archive (atp) + tennis-data.co.uk current season"),
            ("build_date", date.today().isoformat()),
            ("latest_match", str(int(matches["tourney_date"].max()))),
            ("latest_ranking", str(int(rankings["ranking_date"].max()))),
        ], columns=["key", "value"])
        copy_df(cur, "meta", meta)

        # keep the autoincrement sequence past the ids we just inserted
        cur.execute("SELECT setval('matches_id_seq', (SELECT MAX(id) FROM matches))")
        conn.commit()

    print("done")


if __name__ == "__main__":
    main()
