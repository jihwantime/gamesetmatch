"""Build an incremental SQL update for an already-seeded D1 database.

Used by the weekly refresh (.github/workflows/refresh-data.yml) so a routine
update writes a few thousand rows instead of re-importing all 80k matches.

What it emits, in order, to etl/out/delta.sql:

1. new players (INSERT OR IGNORE)
2. the **current season rebuilt**: delete this season's matches, re-insert them.
   A straight insert would duplicate: a tournament first ingested from
   tennis-data.co.uk carries a synthetic tourney_id ("2026-td-wimbledon"), and
   when the Sackmann archive later publishes the same event under its own id
   ("2026-540") the UNIQUE(tourney_id, match_num) key would not collide. Rebuilding
   the season also lets stats/ratings appear once the archive catches up.
3. new official ranking snapshots (INSERT OR IGNORE), then the derived current
   snapshot: any snapshot newer than the newest official one is deleted and
   replaced, so only one derived snapshot exists at a time.
4. Elo ratings, fully replaced (a few thousand rows, and every rating shifts).
5. meta refreshed.

Historical per-match ratings are left as-is: re-running the percentile mapping
shifts old values by hundredths, which is not worth 80k writes a week.
"""

import argparse
import json
import sys
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))

from build_seed import (  # noqa: E402
    DATA,
    ELO_CSV,
    LIVE_COLS,
    LIVE_RANKINGS_CSV,
    MATCH_COLS,
    OUT,
    RATINGS_CSV,
    insert_statements,
    load_matches,
    load_players,
    load_rankings,
)

PLAYER_COLS = ["id", "first_name", "last_name", "full_name", "hand", "dob", "ioc", "height"]
RANKING_COLS = ["ranking_date", "rank", "player_id", "points"]
ELO_COLS = ["player_id", "elo", "elo_hard", "elo_clay", "elo_grass", "elo_carpet", "matches", "peak_elo"]


def latest_official_ranking_date() -> int:
    official = pd.read_csv(DATA / "atp_rankings_current.csv", low_memory=False)
    return int(pd.to_numeric(official["ranking_date"], errors="coerce").max())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--season-start",
        type=int,
        default=date.today().year * 10000,
        help="yyyymmdd; matches on/after this date are rebuilt (default Jan 1 this year)",
    )
    ap.add_argument(
        "--rankings-since",
        type=int,
        default=int((date.today() - timedelta(days=120)).strftime("%Y%m%d")),
        help="yyyymmdd; ranking snapshots on/after this date are (re-)sent (default: 120 days ago)",
    )
    args = ap.parse_args()

    OUT.mkdir(exist_ok=True)

    matches = load_matches()
    player_ids = set(matches["winner_id"].dropna()) | set(matches["loser_id"].dropna())
    players = load_players(player_ids)
    rankings = load_rankings(player_ids)

    season = matches[matches["tourney_date"] >= args.season_start]
    official_max = latest_official_ranking_date()
    rank_new = rankings[
        (rankings["ranking_date"] >= args.rankings_since)
        & (rankings["ranking_date"] <= official_max)
    ]

    parts: list[str] = ["-- gamesetmatch incremental refresh\n"]

    parts.append("\n-- 1. players\n")
    parts.append(insert_statements("players", PLAYER_COLS,
                                   list(players.itertuples(index=False, name=None)),
                                   "INSERT OR IGNORE"))

    parts.append(f"\n-- 2. rebuild season from {args.season_start}\n")
    parts.append(f"DELETE FROM matches WHERE tourney_date >= {args.season_start};\n")
    parts.append(insert_statements("matches", MATCH_COLS,
                                   list(season.itertuples(index=False, name=None))))

    parts.append("\n-- 3. rankings\n")
    parts.append(insert_statements("rankings", RANKING_COLS,
                                   list(rank_new.itertuples(index=False, name=None)),
                                   "INSERT OR IGNORE"))
    # clears any snapshot newer than the official one, including the derived
    # snapshots written by earlier versions of this pipeline
    parts.append(f"DELETE FROM rankings WHERE ranking_date > {official_max};\n")

    if ELO_CSV.exists():
        elo = pd.read_csv(ELO_CSV)
        elo = elo[elo["player_id"].isin(player_ids)]
        parts.append("\n-- 4. Elo\n")
        parts.append("DELETE FROM player_elo;\n")
        parts.append(insert_statements("player_elo", ELO_COLS,
                                       list(elo[ELO_COLS].itertuples(index=False, name=None))))

    if LIVE_RANKINGS_CSV.exists():
        live = pd.read_csv(LIVE_RANKINGS_CSV)
        live = live[live["player_id"].isin(player_ids)]
        parts.append("\n-- 4b. live top-20 board (replaced wholesale each run)\n")
        parts.append("DELETE FROM live_rankings;\n")
        parts.append(insert_statements("live_rankings", LIVE_COLS,
                                       list(live[LIVE_COLS].itertuples(index=False, name=None))))

    meta = [
        ("build_date", date.today().isoformat()),
        ("ratings", "yes" if RATINGS_CSV.exists() else "no"),
        ("elo", "yes" if ELO_CSV.exists() else "no"),
        ("latest_match", str(int(matches["tourney_date"].max()))),
        ("latest_ranking", str(official_max)),
    ]
    parts.append("DELETE FROM meta WHERE key = 'latest_ranking_derived';\n")
    parts.append("\n-- 5. meta\n")
    parts.append(insert_statements("meta", ["key", "value"], meta, "INSERT OR REPLACE"))

    path = OUT / "delta.sql"
    path.write_text("".join(parts))
    # Read by apply_d1_delta.py, which refuses to apply a delta that would move
    # latest_match backwards -- the season rebuild above DELETEs before it
    # re-inserts, so a build missing the current-season top-up would otherwise
    # silently drop matches D1 already has.
    (OUT / "delta_meta.json").write_text(json.dumps({
        "latest_match": int(matches["tourney_date"].max()),
        "season_matches": len(season),
    }))
    rows = len(players) + len(season) + len(rank_new) + len(meta)
    print(
        f"wrote {path} — {len(players)} players, {len(season)} season matches, "
        f"{len(rank_new)} ranking rows through official snapshot {official_max} "
        f"(~{rows} row writes, {path.stat().st_size // 1024} KB)"
    )


if __name__ == "__main__":
    main()
