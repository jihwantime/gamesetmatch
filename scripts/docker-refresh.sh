#!/bin/sh
# Explicit full reload of the local Compose database; stop on pipeline errors.
set -eu
python etl/download.py
python etl/fetch_recent.py
python etl/fetch_live_rankings.py
python ml/train_rating.py
python ml/train_elo.py
python etl/load_postgres.py
python etl/report_freshness.py
