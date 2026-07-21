"""Compute surface-aware Elo ratings for match prediction.

Replays every ATP match in chronological order and maintains an Elo rating per
player (overall) plus one per surface. Elo is the standard approach for tennis
forecasting (e.g. FiveThirtyEight): after each match the winner gains and the
loser loses points, scaled by how surprising the result was. A dynamic K-factor
(538's `250 / (n+5)^0.4`) lets new players' ratings move fast and settles them
as they accumulate matches.

The current ratings are stored in D1 (`player_elo`); the Worker turns two
players' ratings into a win probability at request time via the logistic Elo
formula, so no model runs server-side.

Prediction for a given surface blends surface-specific and overall Elo
(0.6 / 0.4), which is robust when a player has few matches on that surface.

Outputs: ml/out/elo.csv, ml/out/elo_metrics.json
"""

import json
import math
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).parent.parent
DATA = ROOT / "etl" / "data"
OUT = ROOT / "ml" / "out"

YEARS = range(2000, 2027)
BASE = 1500.0
SURFACES = ("Hard", "Clay", "Grass", "Carpet")
SURFACE_WEIGHT = 0.6          # weight on surface Elo vs overall in predictions
EVAL_FROM = 20100101          # start scoring predictions after a burn-in period

ROUND_ORDER = {
    "R128": 1, "R64": 2, "R32": 3, "R16": 4, "QF": 5, "SF": 6, "F": 7,
    "RR": 0, "BR": 6, "ER": 0, "Q1": 0, "Q2": 0, "Q3": 0,
}


def k_factor(n: int) -> float:
    return 250.0 / ((n + 5) ** 0.4)


def expected(r_a: float, r_b: float) -> float:
    return 1.0 / (1.0 + 10 ** ((r_b - r_a) / 400.0))


def load_matches() -> pd.DataFrame:
    frames = [pd.read_csv(DATA / f"atp_matches_{y}.csv", low_memory=False) for y in YEARS]
    recent = DATA / "recent_matches.csv"
    if recent.exists():
        frames.append(pd.read_csv(recent, low_memory=False))
    df = pd.concat(frames, ignore_index=True)
    df = df.drop_duplicates(subset=["tourney_id", "match_num"], keep="first")
    df = df.dropna(subset=["winner_id", "loser_id", "tourney_date"])
    df["winner_id"] = df["winner_id"].astype(int)
    df["loser_id"] = df["loser_id"].astype(int)
    df["tourney_date"] = df["tourney_date"].astype(int)
    df["match_num"] = pd.to_numeric(df["match_num"], errors="coerce").fillna(0).astype(int)
    df["round_ord"] = df["round"].map(ROUND_ORDER).fillna(3).astype(int)
    df["winner_rank"] = pd.to_numeric(df["winner_rank"], errors="coerce")
    df["loser_rank"] = pd.to_numeric(df["loser_rank"], errors="coerce")
    return df.sort_values(["tourney_date", "round_ord", "match_num"]).reset_index(drop=True)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    df = load_matches()

    elo: dict[int, float] = {}
    peak: dict[int, float] = {}
    n_played: dict[int, int] = {}
    selo: dict[str, dict[int, float]] = {s: {} for s in SURFACES}
    sn: dict[str, dict[int, int]] = {s: {} for s in SURFACES}

    # prequential (walk-forward) evaluation accumulators
    ev_n = ev_correct = 0
    ev_logloss = ev_brier = 0.0
    rank_n = rank_correct = 0

    for row in df.itertuples(index=False):
        w, l = row.winner_id, row.loser_id
        surface = row.surface if row.surface in SURFACES else None

        rw, rl = elo.get(w, BASE), elo.get(l, BASE)
        # blended rating used for the (pre-match) prediction
        if surface:
            sw = selo[surface].get(w, BASE)
            sl = selo[surface].get(l, BASE)
            pw = SURFACE_WEIGHT * sw + (1 - SURFACE_WEIGHT) * rw
            pl = SURFACE_WEIGHT * sl + (1 - SURFACE_WEIGHT) * rl
        else:
            pw, pl = rw, rl

        if row.tourney_date >= EVAL_FROM:
            p = expected(pw, pl)  # modeled probability the actual winner wins
            ev_n += 1
            ev_correct += 1 if p > 0.5 else 0
            ev_logloss += -math.log(max(p, 1e-9))
            ev_brier += (1 - p) ** 2
            if not math.isnan(row.winner_rank) and not math.isnan(row.loser_rank):
                rank_n += 1
                rank_correct += 1 if row.winner_rank < row.loser_rank else 0

        # update overall Elo
        e = expected(rw, rl)
        kw, kl = k_factor(n_played.get(w, 0)), k_factor(n_played.get(l, 0))
        elo[w] = rw + kw * (1 - e)
        elo[l] = rl - kl * (1 - e)
        n_played[w] = n_played.get(w, 0) + 1
        n_played[l] = n_played.get(l, 0) + 1
        peak[w] = max(peak.get(w, BASE), elo[w])
        peak[l] = max(peak.get(l, BASE), elo.get(l, BASE))

        # update surface Elo
        if surface:
            sw, sl = selo[surface].get(w, BASE), selo[surface].get(l, BASE)
            se = expected(sw, sl)
            skw, skl = k_factor(sn[surface].get(w, 0)), k_factor(sn[surface].get(l, 0))
            selo[surface][w] = sw + skw * (1 - se)
            selo[surface][l] = sl - skl * (1 - se)
            sn[surface][w] = sn[surface].get(w, 0) + 1
            sn[surface][l] = sn[surface].get(l, 0) + 1

    rows = []
    for pid, r in elo.items():
        rows.append({
            "player_id": pid,
            "elo": round(r, 1),
            "elo_hard": round(selo["Hard"].get(pid, BASE), 1),
            "elo_clay": round(selo["Clay"].get(pid, BASE), 1),
            "elo_grass": round(selo["Grass"].get(pid, BASE), 1),
            "elo_carpet": round(selo["Carpet"].get(pid, BASE), 1),
            "matches": n_played.get(pid, 0),
            "peak_elo": round(peak.get(pid, BASE), 1),
        })
    out = pd.DataFrame(rows).sort_values("elo", ascending=False)
    out.to_csv(OUT / "elo.csv", index=False)

    metrics = {
        "n_eval": ev_n,
        "accuracy": round(ev_correct / ev_n, 4),
        "log_loss": round(ev_logloss / ev_n, 4),
        "brier": round(ev_brier / ev_n, 4),
        "rank_baseline_accuracy": round(rank_correct / rank_n, 4),
        "eval_from": EVAL_FROM,
        "note": "walk-forward: each match scored by Elo as of just before it was played",
    }
    (OUT / "elo_metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"wrote {OUT/'elo.csv'}: {len(out)} players")
    print(json.dumps(metrics, indent=2))
    print("\nTop 10 by current overall Elo:")
    names = pd.read_csv(DATA / "atp_players.csv", low_memory=False)
    names["full"] = names["name_first"].fillna("") + " " + names["name_last"].fillna("")
    top = out.head(10).merge(names[["player_id", "full"]], on="player_id", how="left")
    for t in top.itertuples(index=False):
        print(f"  {t.elo:6.0f}  {t.full}")


if __name__ == "__main__":
    main()
