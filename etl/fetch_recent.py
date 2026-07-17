"""Top up the Sackmann archive with current-season results from tennis-data.co.uk.

The Sackmann archive (stats-rich) lags a few weeks; tennis-data.co.uk publishes
the current season's results (scores + ranks, no serve stats) within days. This
script downloads the season file, maps players onto Sackmann player ids, converts
rows into the Sackmann matches-CSV column layout (stat columns empty -> those
matches stay unrated in the app), dedupes anything the archive already covers,
and writes etl/data/recent_matches.csv for build_seed.py to append.
"""

import re
import unicodedata
from pathlib import Path

import pandas as pd
import requests

DATA = Path(__file__).parent / "data"
YEAR = 2026
URL = f"http://www.tennis-data.co.uk/{YEAR}/{YEAR}.xlsx"

SACKMANN_COLS = [
    "tourney_id", "tourney_name", "surface", "draw_size", "tourney_level",
    "tourney_date", "match_num", "winner_id", "loser_id", "score", "best_of",
    "round", "minutes", "winner_rank", "winner_rank_points", "loser_rank",
    "loser_rank_points",
]

LEVEL = {"Grand Slam": "G", "Masters 1000": "M", "ATP500": "A", "ATP250": "A"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


def build_name_index() -> dict[tuple[str, str], int]:
    """(normalized last-name key, first initial) -> player_id.

    Keys per player, in decreasing priority (later writes never overwrite an
    existing key from a higher-priority pass):
    1. full last name              ("Van De Zandschulp", B)
    2. each word of the last name  ("Mpetshi", G) for "Mpetshi Perricard"
    3. swapped first/last          ("Bu", Y) for first=Bu last=Yunchaokete
    Recently active players win collisions.
    """
    players = pd.read_csv(DATA / "atp_players.csv", low_memory=False)

    activity: dict[int, int] = {}
    for y in (YEAR - 2, YEAR - 1, YEAR):
        f = DATA / f"atp_matches_{y}.csv"
        if not f.exists():
            continue
        m = pd.read_csv(f, usecols=["winner_id", "loser_id"])
        for pid in pd.concat([m["winner_id"], m["loser_id"]]):
            activity[int(pid)] = activity.get(int(pid), 0) + 1

    active = players[players["player_id"].isin(activity)]
    index: dict[tuple[str, str], int] = {}
    best: dict[tuple[str, str], int] = {}

    def add(key: tuple[str, str], pid: int, priority_new_key: bool) -> None:
        if key[0] == "" or key[1] == "":
            return
        if key not in index or (priority_new_key and activity[pid] > best[key]):
            index[key] = pid
            best[key] = activity[pid]

    for pass_no in range(3):
        for _, p in active.iterrows():
            pid = int(p["player_id"])
            last, first = str(p["name_last"]), str(p["name_first"])
            if pass_no == 0:
                add((norm(last), norm(first)[:1]), pid, True)
            elif pass_no == 1:
                for word in re.split(r"[\s-]+", last):
                    if len(word) >= 3:
                        add((norm(word), norm(first)[:1]), pid, False)
            else:
                add((norm(first), norm(last)[:1]), pid, False)
    return index


def match_player(name: str, index: dict[tuple[str, str], int]) -> int | None:
    """tennis-data format: 'Auger-Aliassime F.' / 'Tirante T. A.' / 'Van De Zandschulp B.'"""
    tokens = name.strip().split()
    initials = ""
    # trailing initial groups: "F." "J.L." and abbreviations like "Dar." / "Zh."
    while len(tokens) > 1 and re.fullmatch(r"(?:[A-Z]\.?){1,2}|[A-Z][a-z]{1,2}\.", tokens[-1]):
        initials = norm(tokens.pop()) + initials
    if not tokens or not initials:
        return None
    last = " ".join(tokens)
    return index.get((norm(last), initials[:1]))


def round_label(rnd: str, series: str) -> str:
    fixed = {"Quarterfinals": "QF", "Semifinals": "SF", "The Final": "F", "Round Robin": "RR"}
    if rnd in fixed:
        return fixed[rnd]
    n = int(rnd[0])  # "1st Round" -> 1
    first_round_draw = 128 if series == "Grand Slam" else 64 if series == "Masters 1000" else 32
    return f"R{first_round_draw // (2 ** (n - 1))}"


def build_score(row: pd.Series) -> str:
    sets = []
    for i in range(1, 6):
        w, l = row.get(f"W{i}"), row.get(f"L{i}")
        if pd.isna(w) or pd.isna(l):
            break
        sets.append(f"{int(w)}-{int(l)}")
    score = " ".join(sets)
    comment = str(row.get("Comment", ""))
    if "Retired" in comment:
        score = (score + " RET").strip()
    elif "Walkover" in comment:
        score = "W/O"
    return score


def main() -> None:
    dest = DATA / f"tennis_data_{YEAR}.xlsx"
    print(f"fetch {URL}")
    resp = requests.get(URL, timeout=120)
    resp.raise_for_status()
    dest.write_bytes(resp.content)

    td = pd.read_excel(dest)
    index = build_name_index()

    # matches the archive already covers: (winner, loser) pairs with dates
    arch = pd.read_csv(DATA / f"atp_matches_{YEAR}.csv", low_memory=False)
    covered_dates: dict[tuple[int, int], list[pd.Timestamp]] = {}
    for _, r in arch.iterrows():
        key = (int(r["winner_id"]), int(r["loser_id"]))
        covered_dates.setdefault(key, []).append(
            pd.to_datetime(str(int(r["tourney_date"])), format="%Y%m%d")
        )

    tourney_start = td.groupby("Tournament")["Date"].transform("min")
    td["tourney_date"] = tourney_start.dt.strftime("%Y%m%d").astype(int)
    td["date_num"] = td["Date"].dt.strftime("%Y%m%d").astype(int)

    out_rows = []
    unmatched: set[str] = set()
    skipped_dupes = 0
    for _, r in td.iterrows():
        wid = match_player(str(r["Winner"]), index)
        lid = match_player(str(r["Loser"]), index)
        if wid is None or lid is None:
            for nm, pid in ((str(r["Winner"]), wid), (str(r["Loser"]), lid)):
                if pid is None:
                    unmatched.add(nm)
            continue
        # same pairing within a week of an archived tournament start = same match.
        # (consecutive tournaments start >=7 days apart; rematches survive)
        start = pd.to_datetime(str(int(r["tourney_date"])), format="%Y%m%d")
        if any(abs((d - start).days) < 7 for d in covered_dates.get((wid, lid), [])):
            skipped_dupes += 1
            continue
        slug = re.sub(r"[^a-z0-9]+", "-", str(r["Tournament"]).lower()).strip("-")
        out_rows.append({
            "tourney_id": f"{YEAR}-td-{slug}",
            "tourney_name": str(r["Tournament"]),
            "surface": str(r["Surface"]),
            "draw_size": None,
            "tourney_level": LEVEL.get(str(r["Series"]), "A"),
            "tourney_date": int(r["tourney_date"]),
            "match_num": 0,
            "winner_id": wid,
            "loser_id": lid,
            "score": build_score(r),
            "best_of": int(r["Best of"]),
            "round": round_label(str(r["Round"]), str(r["Series"])),
            "minutes": None,
            "winner_rank": None if pd.isna(r["WRank"]) else int(r["WRank"]),
            "winner_rank_points": None if pd.isna(r["WPts"]) else int(r["WPts"]),
            "loser_rank": None if pd.isna(r["LRank"]) else int(r["LRank"]),
            "loser_rank_points": None if pd.isna(r["LPts"]) else int(r["LPts"]),
        })

    out = pd.DataFrame(out_rows, columns=SACKMANN_COLS)
    out["match_num"] = out.groupby("tourney_id").cumcount() + 1
    out.to_csv(DATA / "recent_matches.csv", index=False)
    print(f"kept {len(out)} recent matches ({skipped_dupes} already in the archive)")
    if unmatched:
        print(f"unmatched names ({len(unmatched)}): {sorted(unmatched)[:15]}")


if __name__ == "__main__":
    main()
