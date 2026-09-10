"""Print the meta table from production Postgres, for the workflow summary.

Kept as a file rather than an inline heredoc in the workflow so it can be run
and tested locally:

    DATABASE_URL=postgresql://... python etl/report_freshness.py
"""

import os
import sys

import psycopg


def main() -> None:
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL is not set")
    with psycopg.connect(url) as conn, conn.cursor() as cur:
        cur.execute("SELECT key, value FROM meta ORDER BY key")
        rows = cur.fetchall()
        cur.execute("SELECT count(*) FROM matches")
        matches = cur.fetchone()[0]
    for key, value in rows:
        print(f"- {key}: {value}")
    print(f"- matches: {matches:,}")


if __name__ == "__main__":
    main()
