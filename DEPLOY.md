# Deploying to Cloudflare

Everything so far runs locally (wrangler emulates D1 with SQLite under `.wrangler/`).
To put it on the real thing:

1. **Log in** (opens a browser):
   ```sh
   npx wrangler login
   ```
2. **Create the D1 database** and copy the id it prints:
   ```sh
   npx wrangler d1 create gamesetmatch
   ```
   Paste the `database_id` into `wrangler.jsonc`, replacing the zeros placeholder.
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
   `https://gamesetmatch.<your-subdomain>.workers.dev`.

Free-tier fit: the database is ~60MB (limit 500MB), and reads are well within the
daily row-read allowance for a hobby project.

Note: the dataset license (CC BY-NC-SA 4.0) means the deployed site must stay
non-commercial and credit Jeff Sackmann's tennis_atp.
