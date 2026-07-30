# Deploying to Cloudflare

**Live:** https://gamesetmatch.jihwantime.workers.dev

Local dev still uses wrangler's emulated D1 (SQLite under `.wrangler/`). To (re)deploy
to production, or to stand up a fresh Cloudflare account from scratch:

1. **Log in** (opens a browser):
   ```sh
   npx wrangler login
   ```
2. **Create the D1 database** and copy the id it prints:
   ```sh
   npx wrangler d1 create gamesetmatch
   ```
   Paste the `database_id` into `wrangler.jsonc` (the current one is already committed
   for this project's database).
3. **Seed the remote database** (same files as local, with `--remote`):
   ```sh
   npx wrangler d1 execute gamesetmatch --remote --file=schema.sql
   for f in etl/out/*.sql; do npx wrangler d1 execute gamesetmatch --remote --file="$f"; done
   ```
   The seed files must exist first (`etl/download.py` → `etl/build_seed.py`, ideally after
   `ml/train_rating.py` so ratings are included). Remote execute is slower than local;
   expect the matches file to take a few minutes.
4. **Deploy the Worker + frontend**:
   ```sh
   npm run deploy
   ```
   That builds `web/dist` and publishes the Worker serving both the API and the app at
   `https://gamesetmatch.<your-subdomain>.workers.dev`. (A first-time account also needs a
   workers.dev subdomain registered — wrangler prompts with a dashboard link.)

## Redeploying after data or code changes

- **Code / UI only:** `npm run deploy`.
- **Data refresh:** handled automatically — see below. To do it by hand:
  ```sh
  python etl/download.py && python etl/fetch_recent.py
  python ml/train_rating.py && python ml/train_elo.py
  python etl/build_delta.py
  npx wrangler d1 execute gamesetmatch --remote -y --file=etl/out/delta.sql
  ```
  No redeploy needed — the Worker reads D1 live.

## Weekly automatic refresh

`.github/workflows/refresh-data.yml` runs the pipeline above every **Monday 07:00 UTC**
(and on demand from the Actions tab). It pushes an incremental update — a few thousand
rows — instead of re-importing all 80k matches.

**One-time setup:** the workflow needs a Cloudflare API token as a repository secret.

1. Go to [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
   → **Create Token** → use the **Edit Cloudflare Workers** template (it includes D1 write
   access), or a custom token with `Account → D1 → Edit`.
2. Copy the token, then in GitHub: repo → **Settings → Secrets and variables → Actions →
   New repository secret**, name it `CLOUDFLARE_API_TOKEN`.

Until that secret exists the refresh job will fail at the "Apply to production D1" step;
everything before it (download, training, SQL build) still runs.

### What actually gets fresher each week

| | Source | Cadence |
| --- | --- | --- |
| Match results | tennis-data.co.uk current season | within days of play |
| Match stats (aces, serve %) + ratings | Sackmann archive | when the archive publishes (weeks) |
| Ranking points/positions | official snapshots, plus points observed in recent matches | weekly |
| Form (L20), Elo, predictions | recomputed from whatever matches exist | every run |

Matches that arrive from tennis-data.co.uk have scores and ranks but no serve stats, so
they show an unrated “—” until the archive catches up; the weekly job rebuilds the current
season each run, so those rows gain stats and ratings automatically once it does.

The newest ranking snapshot is re-ranked from official ranking points carried into recent
matches when the archive's own ranking table lags; `meta.latest_ranking_derived` records
whether the top snapshot was built that way.

Free-tier fit: the database is ~60MB (limit 500MB), and reads are well within the
daily row-read allowance for a hobby project.

Note: the dataset license (CC BY-NC-SA 4.0) means the deployed site must stay
non-commercial and credit Jeff Sackmann's tennis_atp.
