#!/usr/bin/env bash
# One-shot loader: pushes the local dataset into the hosted Neon database.
#
# Run this from your own terminal (not through Claude) — Claude's sandbox
# redacts DATABASE_URL, so it cannot make this connection itself.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

echo "==> Checking Vercel login"
if ! npx --yes vercel@latest whoami >/dev/null 2>&1; then
  echo "Not logged in. Opening browser…"
  npx --yes vercel@latest login
fi

echo "==> Pulling production environment"
cd "$ROOT/web-next"
npx --yes vercel@latest env pull .env.production.local --environment=production --yes
set -a; . ./.env.production.local; set +a
cd "$ROOT"

# Bulk COPY is happier on a direct connection than through the pooler.
DB="${POSTGRES_URL_NON_POOLING:-${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-}}}"
if [ -z "$DB" ]; then
  echo "ERROR: no database URL found in the pulled environment." >&2
  exit 1
fi

echo "==> Loading data into Neon (a few minutes for ~81MB)"
DATABASE_URL="$DB" .venv/bin/python etl/load_postgres.py

echo
echo "==> Verifying"
DATABASE_URL="$DB" .venv/bin/python - <<'PY'
import os, re, psycopg
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
