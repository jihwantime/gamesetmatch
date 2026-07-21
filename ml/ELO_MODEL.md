# Match predictor — surface-aware Elo

Powers the **Predict** page: pick two players and a surface, get a win probability.

## How it works

Elo is the standard model for tennis forecasting (FiveThirtyEight's tennis model is
Elo-based). Every player carries a rating; after each match the winner gains points and
the loser loses the same amount, scaled by how surprising the result was:

```
expected_win = 1 / (1 + 10^((opponent_elo - player_elo) / 400))
new_elo      = elo + K * (actual - expected_win)
```

`ml/train_elo.py` replays **all 79,598 matches in chronological order** (2000 → present),
maintaining:

- an **overall** Elo per player, and
- a separate Elo **per surface** (Hard / Clay / Grass / Carpet).

The K-factor is dynamic — `250 / (matches_played + 5)^0.4` (FiveThirtyEight's formula) —
so a newcomer's rating moves fast and a veteran's is stable. Everyone starts at 1500.

The final ratings are stored in D1 (`player_elo`). The Worker computes the prediction at
request time with the logistic formula above — no model runs server-side.

**Surface blend:** a prediction on a given surface uses
`0.6 × surface_elo + 0.4 × overall_elo`. The blend keeps predictions sensible for players
with few matches on a surface (e.g. almost nobody has a meaningful Carpet sample anymore).

## Evaluation

Scored **walk-forward** — each match from 2010 on is predicted using only the ratings that
existed *before* it was played (no lookahead):

| Metric | Value |
| --- | --- |
| Matches evaluated | 47,263 |
| **Accuracy** | **66.4%** |
| Log loss | 0.610 |
| Brier score | 0.211 |
| ATP-rank baseline (favorite = lower rank) | 65.5% |

66% is in the expected range for tennis pre-match prediction — the sport has high inherent
variance (best-of-three, surface, form, injuries). Elo edges the naive "lower rank wins"
baseline while also producing a calibrated *probability* rather than just a pick.

## Current top 10 by overall Elo

Sinner, Alcaraz, Djokovic, Federer, Zverev, Nadal, Söderling, Fils, del Potro, Medvedev.

Note: retired players keep their last rating (Elo has no decay for inactivity), so a few
past greats sit high on current Elo. That's fine for the predictor — it happily answers
hypotheticals like "peak-form Söderling vs Sinner."

## Limitations

- No inactivity decay, so retirees' ratings are frozen at their last level.
- No explicit best-of-5 vs best-of-3, indoor/outdoor, or fatigue adjustment.
- Elo can't see very recent form shifts faster than results arrive (that's what the
  separate 0–10 performance rating captures per match).
