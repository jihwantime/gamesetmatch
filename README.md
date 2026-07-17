# 🎾 GameSetMatch

An [op.gg](https://op.gg)-style match history site for ATP tennis (2000–2025), built on
**Cloudflare Workers + D1**. Search any tour-level player, browse their match history with
per-match stats, and see an ML-derived **0–10 performance rating** for every player in every
match.

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
.venv/bin/python etl/build_seed.py
npm run db:reset

# run the API (http://localhost:8787) and the frontend (http://localhost:5173)
npm run dev
npm run dev:web
```

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
