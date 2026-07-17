# ML performance ratings

Trains the 0–10 per-match performance rating (see [MODEL_CARD.md](MODEL_CARD.md)).

```sh
# after etl/download.py has populated etl/data/
.venv/bin/python ml/train_rating.py   # → ml/out/ratings.csv + metrics.json
.venv/bin/python etl/build_seed.py    # joins ratings into the matches seed
npm run db:reset                      # reload local D1 with ratings
```
