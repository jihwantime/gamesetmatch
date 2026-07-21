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
- **Data refresh:** re-run the ETL (`etl/fetch_recent.py`, `ml/train_rating.py`,
  `etl/build_seed.py`), then replay the changed seed files with `--remote` as in step 3,
  then `npm run deploy`.

Free-tier fit: the database is ~60MB (limit 500MB), and reads are well within the
daily row-read allowance for a hobby project.

Note: the dataset license (CC BY-NC-SA 4.0) means the deployed site must stay
non-commercial and credit Jeff Sackmann's tennis_atp.
