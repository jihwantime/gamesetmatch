"""Download the ATP slice of the Sackmann tennis archive from Hugging Face.

Files land in etl/data/ (gitignored). Already-downloaded files are skipped,
so re-running is cheap.
"""

from pathlib import Path

import requests

BASE = "https://huggingface.co/datasets/Aneeshers/tennis-sackmann-archive/resolve/main/atp"
DATA_DIR = Path(__file__).parent / "data"

YEARS = range(2000, 2026)

FILES = (
    ["atp_players.csv"]
    + [f"atp_rankings_{d}.csv" for d in ("00s", "10s", "20s", "current")]
    + [f"atp_matches_{y}.csv" for y in YEARS]
)


def main() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    for name in FILES:
        dest = DATA_DIR / name
        if dest.exists() and dest.stat().st_size > 0:
            print(f"skip {name} (already downloaded)")
            continue
        url = f"{BASE}/{name}"
        print(f"fetch {url}")
        resp = requests.get(url, timeout=120)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
    print(f"done: {len(FILES)} files in {DATA_DIR}")


if __name__ == "__main__":
    main()
