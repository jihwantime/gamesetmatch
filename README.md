# 🎾 GameSetMatch

Match history site for ATP tennis (2000–present), built on
**Cloudflare Workers + D1**. Search any tour-level player, browse their match history with
per-match stats, and see an ML-derived **0–10 performance rating** for every player in every
match.

## The rating

Every player in every completed match gets a **performance rating**: a gradient-boosting
model reads the serve/return stat line (plus opponent rank) and estimates how likely that
performance was to win; the probability's percentile becomes the 0–10 score. 5.0 is a
median tour-level performance, 9+ is top-decile, and a tight five-set loss still scores
mid-range. Details, evaluation, and sanity checks: [ml/MODEL_CARD.md](ml/MODEL_CARD.md).

| | |
| --- | --- |
| Matches | 79,598 (2000 → current season, tour-level) |
| Rated performances | 144,444 |
| Players | 2,793 |
| Holdout AUC | 0.9875 (see model card for why that's the point) |

**Data freshness**: the Sackmann archive (rich per-match stats) is the primary source;
`etl/fetch_recent.py` tops up the current season from
[tennis-data.co.uk](http://www.tennis-data.co.uk) (updated within days of play), matching
players onto archive ids and deduplicating overlap. Topped-up matches have scores and
ranks but no serve stats, so they appear unrated ("—") until the archive catches up.

## Stack

- **Database**: Cloudflare D1 (SQLite) — players, matches, weekly rankings
- **API**: Cloudflare Worker with [Hono](https://hono.dev)
- **Frontend**: React + Vite + Tailwind, served as static assets by the same Worker
- **ETL / ML**: Python (pandas, scikit-learn) — offline pipeline that seeds D1 and
  precomputes match ratings
- **Data**: [Jeff Sackmann's tennis archive](https://huggingface.co/datasets/Aneeshers/tennis-sackmann-archive)
  (CC BY-NC-SA 4.0)

## Local development

```sh
npm install

# seed the local D1 database (downloads dataset, builds seed SQL, applies it)
python3 -m venv .venv && .venv/bin/pip install -r etl/requirements.txt
.venv/bin/python etl/download.py
.venv/bin/python etl/fetch_recent.py  # current-season top-up from tennis-data.co.uk
.venv/bin/python ml/train_rating.py   # optional but recommended: compute ratings
.venv/bin/python etl/build_seed.py
npm run db:reset

# run the API (http://localhost:8787) and the frontend (http://localhost:5173)
npm run dev
npm run dev:web
```

Deploying to real Cloudflare (login, `d1 create`, remote seed, `wrangler deploy`):
see [DEPLOY.md](DEPLOY.md).

## Project layout

| Path | Purpose |
| --- | --- |
| `src/` | Worker API (Hono) |
| `web/` | React frontend |
| `schema.sql` | D1 schema |
| `etl/` | dataset download + seed SQL generation |
| `ml/` | performance-rating model training |

## License

Code is MIT. The underlying match data is Jeff Sackmann's
[tennis_atp](https://github.com/JeffSackmann/tennis_atp) dataset, CC BY-NC-SA 4.0 —
non-commercial use only.
