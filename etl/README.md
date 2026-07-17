# ETL pipeline

Offline pipeline that turns [Jeff Sackmann's ATP archive](https://huggingface.co/datasets/Aneeshers/tennis-sackmann-archive)
into a seeded D1 database.

```sh
python3 -m venv .venv && .venv/bin/pip install -r etl/requirements.txt
.venv/bin/python etl/download.py     # CSVs → etl/data/ (gitignored, ~40MB)
.venv/bin/python etl/build_seed.py   # cleaned INSERT batches → etl/out/*.sql
npm run db:reset                     # schema.sql + seeds → local D1 (.wrangler/)
```

Notes:

- Scope is ATP tour-level matches 2000–2025 (~65k matches, ~3k players).
- Rankings are trimmed to weekly top-300 snapshots from 2000 on — enough for the
  leaderboard and player rank sparklines while keeping the DB small.
- `build_seed.py` joins `ml/out/ratings.csv` into the matches seed when it exists
  (see `ml/`); until then the `winner_rating` / `loser_rating` columns are NULL.
- Walkovers and matches without recorded stats keep NULL stat columns.
