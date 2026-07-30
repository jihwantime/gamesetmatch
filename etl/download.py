"""Download the ATP slice of the Sackmann tennis archive from Hugging Face.

Files land in etl/data/ (gitignored). Already-downloaded files are skipped so
re-running is cheap, except the *mutable* ones (current-season matches and the
current rankings table), which are always re-fetched — that is what keeps a
scheduled refresh actually fresh. Pass --refresh to force re-fetch everything.

Files for the current/next year may not exist upstream yet; a 404 on those is
expected and skipped rather than failing the run.
"""

import argparse
from datetime import date
from pathlib import Path

import requests

BASE = "https://huggingface.co/datasets/Aneeshers/tennis-sackmann-archive/resolve/main/atp"
DATA_DIR = Path(__file__).parent / "data"

FIRST_YEAR = 2000
THIS_YEAR = date.today().year
YEARS = range(FIRST_YEAR, THIS_YEAR + 1)

# re-fetched on every run: upstream keeps appending to these
MUTABLE = {"atp_rankings_current.csv", f"atp_matches_{THIS_YEAR}.csv", "atp_players.csv"}
# absent upstream until the season is underway — a 404 here is not an error
OPTIONAL = {f"atp_matches_{THIS_YEAR}.csv"}

FILES = (
    ["atp_players.csv"]
    + [f"atp_rankings_{d}.csv" for d in ("00s", "10s", "20s", "current")]
    + [f"atp_matches_{y}.csv" for y in YEARS]
)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true", help="re-download every file")
    args = ap.parse_args()

    DATA_DIR.mkdir(exist_ok=True)
    fetched = skipped = missing = 0
    for name in FILES:
        dest = DATA_DIR / name
        fresh_enough = dest.exists() and dest.stat().st_size > 0
        if fresh_enough and not args.refresh and name not in MUTABLE:
            skipped += 1
            continue

        url = f"{BASE}/{name}"
        resp = requests.get(url, timeout=120)
        if resp.status_code == 404 and name in OPTIONAL:
            print(f"not published yet, skipping: {name}")
            missing += 1
            continue
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        print(f"fetched {name} ({len(resp.content) // 1024} KB)")
        fetched += 1

    print(f"done: {fetched} fetched, {skipped} cached, {missing} not yet published → {DATA_DIR}")


if __name__ == "__main__":
    main()
