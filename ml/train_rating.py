"""Train the per-match performance rating model.

Each completed match yields two rows (one per player) of performance features
derived from the serve/return stat lines. A gradient-boosting classifier
predicts "did this player win the match"; its calibrated probability is a
performance index, which we map through its empirical percentile onto a 0-10
scale. 5 is a median tour-level performance, 9+ is a top-decile one.

Ratings are produced with 5-fold out-of-fold predictions, so no match is
scored by a model that trained on it. A separate temporal split (train
2000-2019, test 2020-2025) provides the honestly-reported AUC in metrics.json.

Outputs: ml/out/ratings.csv, ml/out/metrics.json
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import cross_val_predict

ROOT = Path(__file__).parent.parent
DATA = ROOT / "etl" / "data"
OUT = ROOT / "ml" / "out"

YEARS = range(2000, 2026)

FEATURES = [
    "first_in_pct", "first_won_pct", "second_won_pct", "ace_rate", "df_rate",
    "bp_save_pct", "bp_faced_per_svgm", "serve_pts_won_pct",
    "ret_pts_won_pct", "bp_convert_pct", "bp_chances_per_retgm",
    "dominance_ratio", "log_opp_rank", "best_of",
]


def side_features(df: pd.DataFrame, me: str, opp: str) -> pd.DataFrame:
    """Build one player's feature row from their ('w'/'l') and the opponent's stat prefix."""
    f = pd.DataFrame(index=df.index)
    svpt = df[f"{me}_svpt"]
    first_in = df[f"{me}_1stIn"]
    second_pts = svpt - first_in
    f["first_in_pct"] = first_in / svpt
    f["first_won_pct"] = df[f"{me}_1stWon"] / first_in
    f["second_won_pct"] = df[f"{me}_2ndWon"] / second_pts
    f["ace_rate"] = df[f"{me}_ace"] / svpt
    f["df_rate"] = df[f"{me}_df"] / svpt
    f["bp_save_pct"] = df[f"{me}_bpSaved"] / df[f"{me}_bpFaced"]
    f["bp_faced_per_svgm"] = df[f"{me}_bpFaced"] / df[f"{me}_SvGms"]
    serve_won = (df[f"{me}_1stWon"] + df[f"{me}_2ndWon"]) / svpt
    f["serve_pts_won_pct"] = serve_won

    opp_svpt = df[f"{opp}_svpt"]
    opp_serve_won = (df[f"{opp}_1stWon"] + df[f"{opp}_2ndWon"]) / opp_svpt
    f["ret_pts_won_pct"] = 1 - opp_serve_won
    bp_chances = df[f"{opp}_bpFaced"]
    f["bp_convert_pct"] = (bp_chances - df[f"{opp}_bpSaved"]) / bp_chances
    f["bp_chances_per_retgm"] = bp_chances / df[f"{opp}_SvGms"]
    f["dominance_ratio"] = f["ret_pts_won_pct"] / (1 - serve_won)

    rank_col = "loser_rank" if me == "w" else "winner_rank"
    f["log_opp_rank"] = np.log(df[rank_col].clip(lower=1))
    f["best_of"] = df["best_of"]
    return f.replace([np.inf, -np.inf], np.nan)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    df = pd.concat(
        [pd.read_csv(DATA / f"atp_matches_{y}.csv", low_memory=False) for y in YEARS],
        ignore_index=True,
    )
    df = df.drop_duplicates(subset=["tourney_id", "match_num"], keep="first")

    stat_cols = [f"{s}_{c}" for s in ("w", "l")
                 for c in ("ace", "df", "svpt", "1stIn", "1stWon", "2ndWon", "SvGms", "bpSaved", "bpFaced")]
    for c in stat_cols + ["winner_rank", "loser_rank", "best_of"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    # completed matches with a full stat line on both sides
    ok = (df["w_svpt"] > 0) & (df["l_svpt"] > 0) & df["w_SvGms"].gt(0) & df["l_SvGms"].gt(0)
    df = df[ok].reset_index(drop=True)
    print(f"{len(df)} matches with stats")

    winners = side_features(df, "w", "l")
    winners["won"] = 1
    winners["player_id"] = df["winner_id"]
    losers = side_features(df, "l", "w")
    losers["won"] = 0
    losers["player_id"] = df["loser_id"]
    for part in (winners, losers):
        part["tourney_id"] = df["tourney_id"]
        part["match_num"] = df["match_num"]
        part["year"] = df["tourney_date"] // 10000

    rows = pd.concat([winners, losers], ignore_index=True)
    X = rows[FEATURES]
    y = rows["won"]

    model = HistGradientBoostingClassifier(
        max_iter=300, learning_rate=0.1, max_leaf_nodes=31, random_state=42
    )

    # honest generalization estimate: train on 2000-2019, test on 2020-2025
    train_mask = rows["year"] <= 2019
    model.fit(X[train_mask], y[train_mask])
    test_prob = model.predict_proba(X[~train_mask])[:, 1]
    auc = roc_auc_score(y[~train_mask], test_prob)
    print(f"temporal holdout AUC (2020-2025): {auc:.4f}")

    # out-of-fold probabilities for every row -> the ratings themselves
    oof_prob = cross_val_predict(model, X, y, cv=5, method="predict_proba", n_jobs=-1)[:, 1]

    # empirical percentile -> 0-10 scale (uniform by construction)
    rating = pd.Series(oof_prob).rank(pct=True) * 10
    rows["rating"] = rating.round(2)

    out = rows[["tourney_id", "match_num", "player_id", "rating"]]
    out.to_csv(OUT / "ratings.csv", index=False)
    print(f"wrote {OUT / 'ratings.csv'}: {len(out)} player-match ratings")

    metrics = {
        "n_matches": int(len(df)),
        "n_rows": int(len(rows)),
        "temporal_holdout_auc": round(float(auc), 4),
        "features": FEATURES,
        "win_rating_mean": round(float(rows.loc[rows["won"] == 1, "rating"].mean()), 2),
        "loss_rating_mean": round(float(rows.loc[rows["won"] == 0, "rating"].mean()), 2),
    }
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
