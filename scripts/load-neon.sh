#!/usr/bin/env bash
# One-shot loader: pushes the local dataset into the hosted Neon database.
#
# Vercel stores this project's DATABASE_URL as a "Secret" (write-only) variable,
# so `vercel env pull` returns the placeholder "[SENSITIVE]" rather than the real
# value — for anyone, not just automation. Get the connection string from Neon
# and pass it in:
#
#   export DATABASE_URL='postgresql://...neon.tech/neondb?sslmode=require'
#   bash scripts/load-neon.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -z "${DATABASE_URL:-}" ] || [ "${DATABASE_URL}" = "[SENSITIVE]" ]; then
  cat >&2 <<'MSG'
ERROR: no usable DATABASE_URL.

Vercel marks this variable "Secret", so its value cannot be read back.
Copy the connection string from Neon instead:

  Vercel dashboard -> Storage -> your Neon database -> "Open in Neon"
  (or console.neon.tech) -> Connection string -> copy

Then run:

  export DATABASE_URL='postgresql://...neon.tech/neondb?sslmode=require'
  bash scripts/load-neon.sh

The string stays in your own shell; paste it nowhere else.
MSG
  exit 1
fi

echo "==> Loading data into Neon (a few minutes for ~81MB)"
.venv/bin/python etl/load_postgres.py

echo
echo "==> Verifying"
.venv/bin/python - <<'PY'
import os, psycopg
url = os.environ["DATABASE_URL"]
if "?" in url:
    base, _, q = url.partition("?")
    url = base + "?" + "&".join(p for p in q.split("&") if not p.startswith("schema="))
with psycopg.connect(url) as c, c.cursor() as cur:
    for t in ("players", "matches", "rankings", "live_rankings", "player_elo"):
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        print(f"  {t:15} {cur.fetchone()[0]:>8,}")
PY
echo
echo "Done. Tell Claude it finished and it will verify the live site."
