# GameSetMatch — Next.js + PostgreSQL build

A port of GameSetMatch to the mainstream full-stack JavaScript stack:
**Next.js (App Router) · React · TypeScript · PostgreSQL · Prisma**.

This lives on the `nextjs-postgres` branch. The original **Cloudflare Workers +
D1 + Hono + Vite** build is untouched on `main` and is what's deployed at
https://gamesetmatch.jihwantime.workers.dev.

## Running it

```sh
# 1. PostgreSQL (once)
brew install postgresql@17 && brew services start postgresql@17
createdb gamesetmatch

# 2. Schema + data (from the repo root)
cd web-next && npx prisma migrate dev && cd ..
DATABASE_URL="postgresql://$(whoami)@localhost:5432/gamesetmatch" \
  .venv/bin/python etl/load_postgres.py

# 3. Dev server → http://localhost:3000
npm run dev --prefix web-next
```

## What changed from the Cloudflare build

| | Cloudflare (`main`) | Next.js (this branch) |
| --- | --- | --- |
| Runtime | Workers (V8 isolates) | Node.js |
| Database | D1 (SQLite) | PostgreSQL |
| Data access | Raw SQL over the D1 binding | Prisma ORM + typed raw SQL |
| API | Hono, 7 REST endpoints | Server Components query the DB directly |
| Rendering | Client-side SPA (Vite) | Server-rendered (SSR) |
| Routing | react-router | App Router (file-based) |

Three things genuinely improved in the port:

1. **Server rendering.** `curl` a player page and the name, record, and match
   list are in the HTML. On the SPA they aren't — crawlers and link previews saw
   an empty shell.
2. **No hand-synced API types.** The SPA needed `web/src/api.ts` to mirror the
   Worker's response shapes by hand. Server Components call the query functions
   directly, so a schema change surfaces as a type error instead of a runtime bug.
3. **Filters are URL state.** Match-list filters and the predictor matchup live in
   the query string (`/predict?p1=…&p2=…&surface=Clay`), so every view is
   server-rendered and shareable.

The Python ETL and both ML models are unchanged — they were always
framework-agnostic. Only the serving layer was rewritten; `etl/load_postgres.py`
is the one addition, loading the same cleaned data into Postgres via `COPY`.

## Going back to the Cloudflare version

```sh
git checkout main     # live deployment, unaffected by anything on this branch
```

Nothing here was deployed, and no Cloudflare resource was modified.
