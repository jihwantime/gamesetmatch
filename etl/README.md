# ETL pipeline

Offline pipeline that turns [Jeff Sackmann's ATP archive](https://huggingface.co/datasets/Aneeshers/tennis-sackmann-archive)
into a seeded D1 database.

```sh
python3 -m venv .venv && .venv/bin/pip install -r etl/requirements.txt
.venv/bin/python etl/download.py     # CSVs → etl/data/ (gitignored, ~40MB)
.venv/bin/python etl/fetch_recent.py # current season + derived ranking snapshot
.venv/bin/python etl/build_seed.py   # cleaned INSERT batches → etl/out/*.sql
npm run db:reset                     # schema.sql + seeds → local D1 (.wrangler/)
```

`build_seed.py` produces a **full** load (used to create a database from scratch).
`build_delta.py` produces an **incremental** update for a database that is already
seeded — that is what the weekly refresh workflow applies to production. It rebuilds the
current season rather than appending, because a tournament first ingested from
tennis-data.co.uk carries a synthetic `tourney_id` and would otherwise be duplicated when
the archive publishes the same event under its own id. Re-applying a delta is idempotent.

Notes:

- Scope is ATP tour-level matches 2000–2025 (~65k matches, ~3k players).
- Rankings are trimmed to weekly top-300 snapshots from 2000 on — enough for the
  leaderboard and player rank sparklines while keeping the DB small.
- `build_seed.py` joins `ml/out/ratings.csv` into the matches seed when it exists
  (see `ml/`); until then the `winner_rating` / `loser_rating` columns are NULL.
- Walkovers and matches without recorded stats keep NULL stat columns.
