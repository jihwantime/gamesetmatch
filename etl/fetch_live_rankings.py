"""Fetch the current ATP singles top 20 from Wikipedia.

The Sackmann archive's ranking table lags several weeks, and the ATP's own site
blocks automated access (Cloudflare bot management, plus a robots.txt that
disallows AI agents outright). Wikipedia's "Current tennis rankings" article is
updated weekly from the official release and is freely reusable, so it is used
for a small *live* top-20 board that sits alongside — never merged into — the
archive's full snapshot. Keeping the two tables separate is deliberate: mixing
ranking points from different weeks produces an inconsistent table, which is the
bug this project hit when it tried to derive a current snapshot.

Writes etl/data/live_rankings.csv (rank, player_id, points, as_of). If the page
layout changes or too few players can be matched, it writes nothing and exits 0
so the weekly refresh degrades to "archive only" instead of failing.
"""

import re
import sys
from datetime import datetime
from io import StringIO
from pathlib import Path

import pandas as pd
import requests

from fetch_recent import build_name_index, norm

DATA = Path(__file__).parent / "data"
URL = "https://en.wikipedia.org/wiki/Current_tennis_rankings"
HEADERS = {"User-Agent": "GameSetMatch/1.0 (portfolio project; github.com/jihwantime)"}
HEADER_RE = re.compile(r"ATP rankings \(singles\) as of (\d{1,2}\s+\w+\s+\d{4})", re.I)
MIN_ROWS = 15  # bail out rather than publish a half-parsed board


def find_atp_singles(tables: list[pd.DataFrame]) -> tuple[pd.DataFrame, int] | None:
    """Locate the ATP singles table by its header text and parse the 'as of' date."""
    for t in tables:
        # iterate MultiIndex levels directly: str() on the tuple would escape the
        # non-breaking spaces Wikipedia uses in "27 July 2026"
        if isinstance(t.columns, pd.MultiIndex):
            header = " ".join(str(x) for col in t.columns for x in col)
        else:
            header = " ".join(str(c) for c in t.columns)
        m = HEADER_RE.search(header.replace("\xa0", " "))
        if m:
            as_of = int(datetime.strptime(m.group(1), "%d %B %Y").strftime("%Y%m%d"))
            t = t.copy()
            t.columns = [str(c[-1]) if isinstance(c, tuple) else str(c) for c in t.columns]
            return t, as_of
    return None


def resolve(name: str, index) -> int | None:
    """Map 'Félix Auger-Aliassime' -> player_id.

    Tries the full surname first, then drops leading words ('Juan Martín del
    Potro' -> 'del Potro' -> 'Potro'), which covers compound surnames.
    """
    name = re.sub(r"\[.*?\]|\(.*?\)", "", name).strip()
    parts = name.split()
    if len(parts) < 2:
        return None
    initial = norm(parts[0])[:1]
    for start in range(1, len(parts)):
        pid = index.get((norm(" ".join(parts[start:])), initial))
        if pid is not None:
            return pid
    return None


def main() -> None:
    dest = DATA / "live_rankings.csv"
    try:
        resp = requests.get(URL, headers=HEADERS, timeout=60)
        resp.raise_for_status()
        found = find_atp_singles(pd.read_html(StringIO(resp.text)))
    except Exception as exc:  # network hiccup, layout change, parser error
        print(f"live rankings unavailable ({exc}) — keeping archive snapshot only")
        dest.unlink(missing_ok=True)
        return

    if found is None:
        print("ATP singles table not found on the page — keeping archive snapshot only")
        dest.unlink(missing_ok=True)
        return

    table, as_of = found
    index = build_name_index()

    rows, unmatched = [], []
    for _, r in table.iterrows():
        try:
            rank = int(re.sub(r"\D", "", str(r["No."])))
            points = int(re.sub(r"\D", "", str(r["Points"])))
        except (ValueError, KeyError):
            continue
        pid = resolve(str(r["Player"]), index)
        if pid is None:
            unmatched.append(str(r["Player"]))
            continue
        rows.append({"rank": rank, "player_id": pid, "points": points, "as_of": as_of})

    if len(rows) < MIN_ROWS:
        print(f"only matched {len(rows)} players (need {MIN_ROWS}) — keeping archive snapshot only")
        dest.unlink(missing_ok=True)
        return

    pd.DataFrame(rows).sort_values("rank").to_csv(dest, index=False)
    print(f"live ATP top {len(rows)} as of {as_of} -> {dest.name}")
    if unmatched:
        print(f"  unmatched: {unmatched}")


if __name__ == "__main__":
    sys.exit(main())
