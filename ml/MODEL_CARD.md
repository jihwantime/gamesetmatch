# Performance rating model card

## What it is

A 0–10 grade for **how well a player performed in one specific match**, shown on every
match row and profile in the app. It is *not* a prediction — the model reads the completed
stat line, so it answers "how good was this performance?" rather than "who will win?".

## How it works

1. Every completed match with recorded stats (71,036 of 77,850 matches, 2000–2025) yields
   two rows — one per player — of features derived from the serve/return stat lines:
   - **Serve**: 1st-serve-in %, 1st/2nd-serve win %, ace rate, double-fault rate,
     break-points-saved %, break points faced per service game, service points won %
   - **Return** (from the opponent's serve line): return points won %, break-point
     conversion %, break chances created per return game
   - **Overall**: dominance ratio (return points won % ÷ service points lost %)
   - **Context**: log of opponent's rank, best-of format
2. A `HistGradientBoostingClassifier` (scikit-learn, 300 iterations) predicts whether that
   row's player won the match. Missing values (e.g. no break points faced) stay NaN —
   the model handles them natively.
3. The predicted win probability is mapped through its **empirical percentile** onto 0–10,
   so ratings are uniform by construction: 5.0 is the median tour-level performance,
   9.0+ is a top-decile one.

Ratings are generated with **5-fold out-of-fold prediction** — no match is scored by a
model that saw it in training.

## Evaluation

| Metric | Value |
| --- | --- |
| Temporal holdout AUC (train 2000–2019, test 2020–2025) | **0.9875** |
| Mean rating in wins | 7.44 |
| Mean rating in losses | 2.56 |

The AUC is intentionally high: post-match stats largely determine the result, and that is
the point — the residual overlap between winners and losers is where the rating gets
interesting. A tight five-set loss keeps a mid-range rating while a blowout loss sinks.

## Sanity checks (Djokovic, 2023 Slams)

| Match | Score | Rating |
| --- | --- | --- |
| AO SF vs Paul (W) | 7-5 6-1 6-2 | 9.47 |
| RG SF vs Alcaraz (W) | 6-3 5-7 6-1 6-1 | 8.43 |
| US Open F vs Medvedev (W) | 6-3 7-6(5) 6-3 | 6.43 |
| Wimbledon F vs Alcaraz (L) | 1-6 7-6(6) 6-1 3-6 6-4 | 4.86 |

Career averages: Djokovic 7.22, Federer 7.21, Nadal 7.20 — the big three are
indistinguishable at the top, which is reassuring.

## Limitations

- **No stroke-level features.** Forehand/backhand quality, rally length, and shot
  placement aren't in any public box score — that telemetry (Hawk-Eye/TennisViz) is
  licensed, not published. The serve/return line is the complete public stat record of a
  match. The crowdsourced [Match Charting Project](https://github.com/JeffSackmann/tennis_MatchChartingProject)
  has shot-by-shot charts for a subset of notable matches and could enrich ratings for
  those matches in the future.
- Walkovers and matches without recorded stats are unrated — this includes current-season
  matches sourced from tennis-data.co.uk (scores/ranks only) until the archive catches up.
- Opponent rank is the only context feature; era and surface effects are absorbed by the
  stat features themselves.
- The percentile mapping is global (all matches 2000–2025), not per-surface or per-era.
