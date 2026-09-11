"""Apply etl/out/delta.sql to production D1 -- unless it would lose matches.

build_delta rebuilds the current season by DELETE-then-INSERT. When the
current-season source is unreachable and nothing is cached, the rebuilt season
stops weeks short of what D1 already holds, and applying it deletes those
matches. On 2026-09-10 that took D1 from 2026-08-23 back to 2026-05-25.

So this reads latest_match from the live database first and refuses to apply a
delta that would move it backwards, the same rule load_postgres.py enforces for
Postgres. ALLOW_DATA_REGRESSION=1 overrides it deliberately.

Needs CLOUDFLARE_API_TOKEN and the repo's npm dependencies (wrangler).

    python etl/apply_d1_delta.py
"""

import json
import os
import subprocess
import sys
from pathlib import Path

OUT = Path(__file__).parent / "out"
DB = "gamesetmatch"


def wrangler(*args: str) -> str:
    proc = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB, "--remote", "-y", *args],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        sys.stderr.write(proc.stdout + proc.stderr)
        sys.exit(f"wrangler exited with {proc.returncode}")
    return proc.stdout


def live_latest_match() -> int | None:
    out = wrangler("--json", "--command", "SELECT value FROM meta WHERE key = 'latest_match'")
    # --json prints a bare array: [{"results": [{"value": "20260823"}], "success": true, ...}]
    # Parse from the first bracket in case npx prepends a notice.
    payload = json.loads(out[out.index("["):])
    rows = payload[0].get("results", []) if payload else []
    value = str(rows[0]["value"]) if rows else ""
    return int(value) if value.isdigit() else None


def main() -> None:
    meta = json.loads((OUT / "delta_meta.json").read_text())
    new_latest = int(meta["latest_match"])
    live = live_latest_match()
    print(f"D1 latest_match: live {live}, this delta {new_latest} "
          f"({meta['season_matches']} season matches)")

    if live is not None and new_latest < live:
        if os.environ.get("ALLOW_DATA_REGRESSION") != "1":
            sys.exit(
                f"refusing to apply: latest match would go backwards, {live} -> "
                f"{new_latest}. The current-season source was probably "
                f"unavailable, so this delta would delete matches D1 already "
                f"has. Re-run once it is back, or set ALLOW_DATA_REGRESSION=1 "
                f"if this is deliberate."
            )
        print(f"WARNING: latest match going backwards {live} -> {new_latest} "
              f"(ALLOW_DATA_REGRESSION=1)")

    print(wrangler("--file", str(OUT / "delta.sql")))


if __name__ == "__main__":
    main()
