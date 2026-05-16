"""Pandas data loading and analytics for CRIQ."""
from __future__ import annotations

import math
import re
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent / "data"
MATCHES_PATH = DATA_DIR / "matches.csv"
DELIVERIES_PATH = DATA_DIR / "deliveries.csv"

matches_df: pd.DataFrame | None = None
deliveries_df: pd.DataFrame | None = None
_chase_lookup: pd.DataFrame | None = None


def _parse_over(over_val: float) -> tuple[int, int]:
    """Return (over_number 0-based, ball_in_over 1-6)."""
    s = f"{over_val:.1f}"
    if "." in s:
        o, b = s.split(".")
        return int(o), int(b)
    return int(over_val), 1


def _season_from_date(date_str: str) -> int:
    try:
        return int(str(date_str).strip()[-4:])
    except (ValueError, IndexError):
        return 2026


def load_data() -> None:
    global matches_df, deliveries_df, _chase_lookup
    if not MATCHES_PATH.exists() or not DELIVERIES_PATH.exists():
        raise FileNotFoundError(
            f"Place matches.csv and deliveries.csv in {DATA_DIR}"
        )

    matches_df = pd.read_csv(MATCHES_PATH)
    deliveries_df = pd.read_csv(DELIVERIES_PATH)

    # Normalize standard Kaggle IPL column names
    if "id" in matches_df.columns and "match_id" not in matches_df.columns:
        matches_df = matches_df.rename(columns={"id": "match_id"})
    if "winner" in matches_df.columns and "match_winner" not in matches_df.columns:
        matches_df["match_winner"] = matches_df["winner"]
    if "first_ings_score" not in matches_df.columns:
        matches_df["first_ings_score"] = 160
        matches_df["second_ings_score"] = 0

    if "match_no" in deliveries_df.columns and "match_id" not in deliveries_df.columns:
        deliveries_df = deliveries_df.rename(columns={"match_no": "match_id"})
    elif "match_id" not in deliveries_df.columns and "match_id" in deliveries_df.columns:
        pass
    if "inning" in deliveries_df.columns:
        deliveries_df = deliveries_df.rename(columns={"inning": "innings"})
    if "batter" in deliveries_df.columns and "striker" not in deliveries_df.columns:
        deliveries_df["striker"] = deliveries_df["batter"]
    if "batsman_runs" in deliveries_df.columns and "runs_of_bat" not in deliveries_df.columns:
        deliveries_df["runs_of_bat"] = deliveries_df["batsman_runs"]
    if "total_runs" in deliveries_df.columns and "runs_of_bat" not in deliveries_df.columns:
        deliveries_df["runs_of_bat"] = deliveries_df["total_runs"]
    if "player_dismissed" not in deliveries_df.columns and "is_wicket" in deliveries_df.columns:
        deliveries_df["player_dismissed"] = deliveries_df["is_wicket"].apply(
            lambda x: "x" if x else None
        )

    matches_df["season"] = (
        matches_df["season"]
        if "season" in matches_df.columns
        else matches_df["date"].apply(_season_from_date)
    )
    matches_df["id"] = matches_df["match_id"]

    d = deliveries_df.copy()
    if "match_no" in d.columns:
        d["match_id"] = d["match_no"]
    if "ball" in d.columns and d["over"].dtype in ("int64", "float64") and d["over"].max() <= 20:
        d["over_num"] = d["over"].astype(int)
        d["ball_num"] = d["ball"].astype(int)
    else:
        parsed = d["over"].apply(_parse_over)
        d["over_num"] = parsed.apply(lambda x: x[0])
        d["ball_num"] = parsed.apply(lambda x: x[1])
    d["total_runs"] = d["runs_of_bat"].fillna(0) + d["extras"].fillna(0)
    d["is_wicket"] = d["player_dismissed"].notna() & d["wicket_type"].notna()
    d["batter"] = d["striker"]
    d["runs"] = d["runs_of_bat"].fillna(0)
    d["is_boundary"] = d["runs"].isin([4, 6])
    d["is_dot"] = (d["runs"] == 0) & (d["extras"].fillna(0) == 0) & (~d["wide"].fillna(0).astype(bool))

    def phase(over: int) -> str:
        if over < 6:
            return "powerplay"
        if over < 16:
            return "middle"
        return "death"

    d["phase"] = d["over_num"].apply(phase)
    d["bowler_type"] = "pace"  # default; spin tagged heuristically below
    spin_keywords = re.compile(r"spin|chahal|kuldeep|ashwin|rashid|zampa|mystery", re.I)

    def tag_spin(name: str) -> str:
        if pd.isna(name):
            return "pace"
        return "spin" if spin_keywords.search(str(name)) else "pace"

    bowler_spin_rate = (
        d.groupby("bowler")["runs"]
        .apply(lambda s: (s <= 2).mean())
        .reset_index(name="dotish")
    )
    spin_bowlers = set(
        bowler_spin_rate[bowler_spin_rate["dotish"] > 0.55]["bowler"].tolist()
    )
    d["bowler_type"] = d["bowler"].apply(
        lambda b: "spin" if b in spin_bowlers else tag_spin(b)
    )

    deliveries_df = d
    _chase_lookup = _build_chase_lookup()


def _build_chase_lookup() -> pd.DataFrame:
    """Historical chase outcomes binned by overs left, wickets, run gap."""
    rows = []
    for _, m in matches_df.iterrows():
        mid = m["match_id"]
        md = deliveries_df[deliveries_df["match_id"] == mid]
        if md.empty:
            continue
        chasing = md[md["innings"] == 2]
        if chasing.empty:
            continue
        target = int(m["first_ings_score"]) + 1
        winner = m.get("match_winner", "")
        team2 = m["team2"]
        chase_team = str(chasing["batting_team"].iloc[0])
        chased_won = 1 if str(winner) == chase_team else 0

        cum_runs = 0
        wkts = 0
        for over in range(20):
            over_del = chasing[chasing["over_num"] == over]
            if over_del.empty:
                continue
            cum_runs += int(over_del["total_runs"].sum())
            wkts += int(over_del["is_wicket"].sum())
            balls_left = (19 - over) * 6
            needed = target - cum_runs
            rows.append(
                {
                    "balls_left": balls_left,
                    "wkts_lost": wkts,
                    "runs_needed": needed,
                    "won": chased_won,
                }
            )
    if not rows:
        return pd.DataFrame(columns=["balls_left", "wkts_lost", "runs_needed", "won"])
    return pd.DataFrame(rows)


def _ensure_loaded() -> None:
    if matches_df is None or deliveries_df is None:
        load_data()


def list_matches() -> list[dict[str, Any]]:
    _ensure_loaded()
    out = []
    for _, r in matches_df.iterrows():
        out.append(
            {
                "id": int(r["match_id"]),
                "team1": str(r["team1"]),
                "team2": str(r["team2"]),
                "season": int(r["season"]),
                "venue": str(r["venue"]),
                "date": str(r["date"]),
            }
        )
    return out


def _match_row(match_id: int) -> pd.Series:
    row = matches_df[matches_df["match_id"] == match_id]
    if row.empty:
        raise KeyError(f"Match {match_id} not found")
    return row.iloc[0]


def _deliveries_for_match(match_id: int) -> pd.DataFrame:
    return deliveries_df[deliveries_df["match_id"] == match_id].copy()


def _legal_deliveries(df: pd.DataFrame) -> pd.DataFrame:
    return df[~df["wide"].fillna(0).astype(bool)]


def _overs_bowled(inn_d: pd.DataFrame) -> float:
    """Legal overs faced/bowled in an innings."""
    if inn_d.empty:
        return 0.0
    max_over = int(inn_d["over_num"].max())
    last_over = inn_d[inn_d["over_num"] == max_over]
    legal = _legal_deliveries(last_over)
    if len(legal) > 0:
        balls = len(legal)
    else:
        balls = int(last_over["ball_num"].max()) if "ball_num" in last_over.columns else 6
    return min(max_over + balls / 6.0, 20.0)


def _resolve_team_in_match(team: str, team1: str, team2: str) -> str:
    t = team.strip().lower()
    if t in str(team1).lower() or str(team1).lower() in t:
        return str(team1)
    if t in str(team2).lower() or str(team2).lower() in t:
        return str(team2)
    raise KeyError(f"Team '{team}' not in this match ({team1} vs {team2})")


def _chasing_team(match_id: int) -> str:
    d = _deliveries_for_match(match_id)
    inn2 = d[d["innings"] == 2]
    if inn2.empty:
        m = _match_row(match_id)
        return str(m["team2"])
    return str(inn2["batting_team"].iloc[0])


def _first_innings_team(match_id: int) -> str:
    d = _deliveries_for_match(match_id)
    inn1 = d[d["innings"] == 1]
    if inn1.empty:
        m = _match_row(match_id)
        return str(m["team1"])
    return str(inn1["batting_team"].iloc[0])


def match_summary(match_id: int) -> dict[str, Any]:
    _ensure_loaded()
    m = _match_row(match_id)
    d = _deliveries_for_match(match_id)

    innings_scores = []
    for inn in sorted(d["innings"].unique()):
        inn_d = d[d["innings"] == inn]
        runs = int(inn_d["total_runs"].sum())
        wkts = int(inn_d["is_wicket"].sum())
        overs_batted = _overs_bowled(inn_d)

        # Batting scorecard
        batting_rows = []
        for batter in inn_d["batter"].dropna().unique():
            b_d = inn_d[inn_d["batter"] == batter]
            legal = _legal_deliveries(b_d)
            b_runs = int(b_d["runs"].sum())
            b_balls = len(legal)
            fours = int((b_d["runs"] == 4).sum())
            sixes = int((b_d["runs"] == 6).sum())
            sr = (b_runs / b_balls * 100) if b_balls > 0 else 0
            dismissed = b_d["is_wicket"].sum() > 0
            batting_rows.append({
                "batter": str(batter),
                "runs": b_runs,
                "balls": b_balls,
                "fours": fours,
                "sixes": sixes,
                "strike_rate": round(sr, 2),
                "dismissed": bool(dismissed)
            })
        
        # Bowling scorecard
        bowling_rows = []
        for bowler in inn_d["bowler"].dropna().unique():
            bw_d = inn_d[inn_d["bowler"] == bowler]
            bw_runs = int(bw_d["total_runs"].sum() - bw_d[bw_d["wide"].notna()]["extras"].sum() if "wide" in bw_d.columns else bw_d["total_runs"].sum()) # Approximation for runs conceded by bowler
            # Better runs conceded: total runs minus byes/legbyes
            if "extras_type" in bw_d.columns:
                bw_runs = int(bw_d[~bw_d["extras_type"].isin(["byes", "legbyes"])]["total_runs"].sum())
            else:
                bw_runs = int(bw_d["total_runs"].sum()) # Fallback
            
            bw_wkts = int(bw_d["is_wicket"].sum())
            legal_bw = _legal_deliveries(bw_d)
            bw_overs = len(legal_bw) / 6.0
            econ = (bw_runs / bw_overs) if bw_overs > 0 else 0
            bowling_rows.append({
                "bowler": str(bowler),
                "overs": round(bw_overs, 1),
                "runs": bw_runs,
                "wickets": bw_wkts,
                "economy": round(econ, 2)
            })

        innings_scores.append(
            {
                "innings": int(inn),
                "team": str(inn_d["batting_team"].iloc[0]) if not inn_d.empty else "",
                "runs": runs,
                "wickets": wkts,
                "overs": round(overs_batted, 1),
                "batting": batting_rows,
                "bowling": bowling_rows
            }
        )

    chasing = d[d["innings"] == 2]
    first_inn = d[d["innings"] == 1]
    first_runs = int(first_inn["total_runs"].sum()) if not first_inn.empty else int(
        m["first_ings_score"]
    )
    current_score = int(chasing["total_runs"].sum()) if not chasing.empty else int(
        m.get("second_ings_score", 0)
    )
    current_wkts = int(chasing["is_wicket"].sum()) if not chasing.empty else int(
        m.get("second_ings_wkts", 0)
    )
    target = first_runs + 1
    overs_completed = _overs_bowled(chasing) if not chasing.empty else 20.0
    overs_remaining = max(20.0 - overs_completed, 0.1)
    runs_needed = max(target - current_score, 0)
    rrr = (runs_needed / overs_remaining) if runs_needed > 0 else 0.0

    run_rate = current_score / max(overs_completed, 0.1)
    projected = int(current_score + run_rate * overs_remaining)

    win_prob = win_probability_series(match_id)

    return {
        "match_id": match_id,
        "team1": str(m["team1"]),
        "team2": str(m["team2"]),
        "venue": str(m["venue"]),
        "winner": str(m.get("match_winner", "")),
        "player_of_match": str(m.get("player_of_the_match", "")),
        "innings": innings_scores,
        "scorecard": {
            "current_score": current_score,
            "wickets": current_wkts,
            "target": target,
            "overs_completed": round(overs_completed, 1),
            "rrr": round(rrr, 2),
            "run_rate": round(run_rate, 2),
            "projected_total": projected,
        },
        "win_probability": win_prob,
    }


def win_probability_series(match_id: int) -> list[dict[str, float]]:
    _ensure_loaded()
    m = _match_row(match_id)
    d = _deliveries_for_match(match_id)
    chasing = d[d["innings"] == 2]
    first_inn = d[d["innings"] == 1]
    target = (
        int(first_inn["total_runs"].sum()) + 1
        if not first_inn.empty
        else int(m["first_ings_score"]) + 1
    )
    chase_team = _chasing_team(match_id)
    winner = str(m.get("match_winner", ""))
    final_win = 100.0 if winner == chase_team else 0.0

    series = []
    cum_runs = 0
    wkts = 0
    for over in range(20):
        over_del = chasing[chasing["over_num"] == over]
        if not over_del.empty:
            cum_runs += int(over_del["total_runs"].sum())
            wkts += int(over_del["is_wicket"].sum())
        balls_left = max((19 - over) * 6, 1)
        runs_needed = target - cum_runs
        wp = _lookup_win_prob(balls_left, wkts, runs_needed)
        if over_del.empty and over > 0:
            wp = series[-1]["win_pct"] if series else 50.0
        series.append({"over": over + 1, "win_pct": round(float(wp), 1)})

    if series:
        series[-1]["win_pct"] = final_win if winner else series[-1]["win_pct"]
    return series


def _lookup_win_prob(balls_left: int, wkts: int, runs_needed: int) -> float:
    if _chase_lookup is None or _chase_lookup.empty:
        if runs_needed <= 0:
            return 95.0
        rpo = runs_needed / max(balls_left / 6.0, 0.5)
        return float(np.clip(85 - rpo * 8 + (10 - wkts) * 3, 5, 95))

    lk = _chase_lookup.copy()
    lk = lk[
        (lk["balls_left"] >= balls_left - 12)
        & (lk["balls_left"] <= balls_left + 12)
        & (lk["wkts_lost"] == wkts)
    ]
    if runs_needed <= 0:
        return 92.0
    if lk.empty:
        rpo = runs_needed / max(balls_left / 6.0, 0.5)
        return float(np.clip(80 - rpo * 7 + (10 - wkts) * 4, 8, 92))
    lk = lk.copy()
    lk["dist"] = (lk["runs_needed"] - runs_needed).abs()
    near = lk.nsmallest(30, "dist")
    return float(near["won"].mean() * 100) if len(near) else 50.0


def pressure_index(match_id: int, team: str | None = None) -> list[dict[str, Any]]:
    _ensure_loaded()
    d = _deliveries_for_match(match_id)
    if team:
        m = _match_row(match_id)
        team_name = _resolve_team_in_match(team, str(m["team1"]), str(m["team2"]))
        d = d[d["batting_team"] == team_name]
    values = []
    last_boundary_over = -3

    for over in range(20):
        od = d[d["over_num"] == over]
        if od.empty:
            values.append({"over": over + 1, "pressure": 0.15, "components": {}})
            continue

        legal = od[~od["wide"].fillna(0).astype(bool)]
        balls = max(len(legal), 1)
        dots = int(legal["is_dot"].sum())
        dot_pct = dots / min(balls, 6)
        boundaries = int(od["is_boundary"].sum())
        if boundaries > 0:
            last_boundary_over = over
        drought = max(over - last_boundary_over, 0) / 3.0
        wkts_3 = int(
            d[(d["over_num"] >= max(over - 2, 0)) & (d["over_num"] <= over)][
                "is_wicket"
            ].sum()
        )
        pressure = dot_pct * 0.4 + min(drought, 1.0) * 0.3 + min(wkts_3 / 3.0, 1.0) * 0.3
        values.append(
            {
                "over": over + 1,
                "pressure": round(float(np.clip(pressure, 0, 1)), 3),
                "dot_pct": round(dot_pct, 2),
                "boundary_drought": round(drought, 2),
                "wkts_cluster": wkts_3,
            }
        )
    return values


def player_stats(name: str) -> dict[str, Any]:
    _ensure_loaded()
    name_l = name.strip().lower()
    bat = deliveries_df[
        deliveries_df["batter"].str.lower().str.contains(name_l, na=False)
    ]
    if bat.empty:
        bat = deliveries_df[deliveries_df["batter"].str.lower() == name_l]
    bowl = deliveries_df[
        deliveries_df["bowler"].str.lower().str.contains(name_l, na=False)
    ]
    if bat.empty and bowl.empty:
        raise KeyError(f"Player {name} not found")

    player_name = (
        bat["batter"].mode().iloc[0]
        if not bat.empty
        else bowl["bowler"].mode().iloc[0]
    )

    balls = len(bat[~bat["wide"].fillna(0).astype(bool)]) if not bat.empty else 0
    runs = int(bat["runs"].sum()) if not bat.empty else 0
    if not bat.empty and "player_dismissed" in bat.columns:
        dismissals = int(
            bat[bat["player_dismissed"].astype(str) == str(player_name)]["is_wicket"].sum()
        )
    else:
        dismissals = int(bat["is_wicket"].sum()) if not bat.empty else 0
    matches = int(bat["match_id"].nunique()) if not bat.empty else int(
        bowl["match_id"].nunique()
    )
    boundaries = int(bat["is_boundary"].sum()) if not bat.empty else 0
    dots = int(bat["is_dot"].sum()) if not bat.empty else 0

    sr = (runs / balls * 100) if balls else 0
    avg = (runs / max(dismissals, 1)) if not bat.empty else 0
    b_pct = (boundaries / balls * 100) if balls else 0
    d_pct = (dots / balls * 100) if balls else 0

    form = _form_trajectory(player_name)
    economy = 0.0
    if not bowl.empty:
        bowl_runs = int(bowl["total_runs"].sum())
        legal_bowl = _legal_deliveries(bowl)
        economy = bowl_runs / max(len(legal_bowl) / 6.0, 0.5)

    return {
        "name": str(player_name),
        "matches": matches,
        "runs": runs,
        "strike_rate": round(sr, 1),
        "average": round(avg, 1),
        "boundary_pct": round(b_pct, 1),
        "dot_ball_pct": round(d_pct, 1),
        "form_trajectory": form,
        "economy": round(economy, 2),
        "wickets": int(bowl["is_wicket"].sum()) if not bowl.empty else 0,
    }


def _form_trajectory(player_name: str) -> list[dict[str, Any]]:
    bat = deliveries_df[deliveries_df["batter"] == player_name]
    if bat.empty:
        return []
    legal = _legal_deliveries(bat)
    match_ids = (
        legal.groupby("match_id")
        .agg(runs=("runs", "sum"), balls=("runs", "count"))
        .reset_index()
        .sort_values("match_id")
    )
    scores = []
    for _, row in match_ids.iterrows():
        balls = max(int(row["balls"]), 1)
        raw = row["runs"] / (balls * 0.5)
        scores.append({"match_id": int(row["match_id"]), "raw": raw})

    trajectory = []
    for i in range(len(scores)):
        window = scores[max(0, i - 4) : i + 1]
        avg_raw = np.mean([s["raw"] for s in window])
        normalized = float(np.clip(avg_raw * 25, 0, 100))
        trajectory.append(
            {
                "match_id": scores[i]["match_id"],
                "form_score": round(normalized, 1),
                "index": i + 1,
            }
        )
    return trajectory[-10:]


def _wagon_angle(runs: int, seed: int) -> tuple[float, float]:
    """Synthetic polar coords for wagon wheel (no Hawkeye in CSV)."""
    rng = np.random.default_rng(seed)
    if runs == 0:
        angle = rng.uniform(0, 2 * math.pi)
        r = rng.uniform(0.15, 0.35)
    elif runs in (1, 2):
        angle = rng.uniform(0, 2 * math.pi)
        r = rng.uniform(0.4, 0.65)
    elif runs == 4:
        angle = rng.choice([0.3, 0.8, 2.4, 3.9]) + rng.uniform(-0.2, 0.2)
        r = rng.uniform(0.75, 0.95)
    elif runs >= 6:
        angle = rng.choice([0.5, 1.2, 2.0, 2.8, 3.5]) + rng.uniform(-0.15, 0.15)
        r = rng.uniform(0.85, 1.0)
    else:
        angle = rng.uniform(0, 2 * math.pi)
        r = 0.5
    x = r * math.cos(angle)
    y = r * math.sin(angle)
    return round(x, 3), round(y, 3)


def wagon_wheel(
    name: str,
    bowler_type: str | None = None,
    phase: str | None = None,
) -> list[dict[str, Any]]:
    _ensure_loaded()
    stats = player_stats(name)
    bat = deliveries_df[deliveries_df["batter"] == stats["name"]]
    if bowler_type and bowler_type != "all":
        bat = bat[bat["bowler_type"] == bowler_type.lower()]
    if phase and phase != "all":
        bat = bat[bat["phase"] == phase.lower()]
    shots = []
    for i, (_, row) in enumerate(bat.iterrows()):
        runs = int(row["runs"])
        x, y = _wagon_angle(runs, seed=i + hash(str(row["match_id"])))
        zone = "boundary" if runs >= 4 else "single" if runs > 0 else "dot"
        shots.append(
            {
                "x": x,
                "y": y,
                "runs": runs,
                "zone": zone,
                "over": int(row["over_num"]),
                "bowler": str(row["bowler"]),
            }
        )
    return shots[-500:]


def matchup(bat: str, bowl: str) -> dict[str, Any]:
    _ensure_loaded()
    bat_s = player_stats(bat)
    bowl_s = player_stats(bowl)
    df = deliveries_df[
        (deliveries_df["batter"] == bat_s["name"])
        & (deliveries_df["bowler"] == bowl_s["name"])
    ]
    if df.empty:
        return {
            "batsman": bat_s["name"],
            "bowler": bowl_s["name"],
            "balls": 0,
            "runs": 0,
            "dismissals": 0,
            "average": 0,
            "strike_rate": 0,
            "pitch_zones": [],
        }

    balls = len(df[~df["wide"].fillna(0).astype(bool)])
    runs = int(df["runs"].sum())
    dismissals = int(df["is_wicket"].sum())
    sr = runs / balls * 100 if balls else 0
    avg = runs / max(dismissals, 1)

    zones = []
    for i, (_, row) in enumerate(df[df["is_wicket"]].iterrows()):
        x, y = _wagon_angle(0, seed=i + 99)
        zones.append({"x": x, "y": y, "kind": str(row["wicket_type"])})

    for i, (_, row) in enumerate(df[~df["is_wicket"]].head(40).iterrows()):
        x, y = _wagon_angle(int(row["runs"]), seed=i)
        zones.append({"x": x, "y": y, "kind": "shot", "runs": int(row["runs"])})

    return {
        "batsman": bat_s["name"],
        "bowler": bowl_s["name"],
        "balls": balls,
        "runs": runs,
        "dismissals": dismissals,
        "average": round(avg, 1),
        "strike_rate": round(sr, 1),
        "pitch_zones": zones,
    }


def team_phases(team: str) -> dict[str, Any]:
    _ensure_loaded()
    team_l = team.strip().lower()
    bat = deliveries_df[
        deliveries_df["batting_team"].str.lower().str.contains(team_l, na=False)
    ]
    bowl = deliveries_df[
        deliveries_df["bowling_team"].str.lower().str.contains(team_l, na=False)
    ]
    team_name = (
        bat["batting_team"].mode().iloc[0]
        if not bat.empty
        else bowl["bowling_team"].mode().iloc[0]
    )

    phases = ["powerplay", "middle", "death"]
    batting = {}
    bowling = {}
    for ph in phases:
        b = bat[bat["phase"] == ph]
        bl = bowl[bowl["phase"] == ph]
        b_balls = max(len(b[~b["wide"].fillna(0).astype(bool)]), 1)
        bl_balls = max(len(bl[~bl["wide"].fillna(0).astype(bool)]), 1)
        batting[ph] = {
            "strike_rate": round(int(b["runs"].sum()) / b_balls * 100, 1),
            "runs": int(b["runs"].sum()),
        }
        legal_bl = _legal_deliveries(bl)
        overs_bowled = max(len(legal_bl) / 6.0, 0.5)
        bowling[ph] = {
            "economy": round(int(bl["total_runs"].sum()) / overs_bowled, 2),
            "wickets": int(bl["is_wicket"].sum()),
        }

    accel = _acceleration_detector(team_name)
    return {
        "team": str(team_name),
        "batting": batting,
        "bowling": bowling,
        "acceleration_overs": accel,
    }


def _acceleration_detector(team: str) -> list[dict[str, Any]]:
    highlights = []
    team_matches = deliveries_df[deliveries_df["batting_team"] == team]["match_id"].unique()
    for mid in team_matches:
        md = deliveries_df[
            (deliveries_df["match_id"] == mid)
            & (deliveries_df["batting_team"] == team)
        ]
        over_runs = md.groupby("over_num")["total_runs"].sum()
        if over_runs.empty:
            continue
        avg = over_runs.mean()
        for over, r in over_runs.items():
            if avg > 0 and r > 1.5 * avg:
                highlights.append(
                    {
                        "match_id": int(mid),
                        "over": int(over) + 1,
                        "runs": int(r),
                        "match_avg": round(float(avg), 2),
                    }
                )
    return highlights[:15]


def venue_toss(venue: str) -> dict[str, Any]:
    _ensure_loaded()
    venue_l = venue.strip().lower()
    vm = matches_df[
        matches_df["venue"].str.lower().str.contains(venue_l, na=False)
    ]
    if vm.empty:
        raise KeyError(f"Venue {venue} not found")
    venue_name = vm["venue"].iloc[0]
    results = []
    for decision in vm["toss_decision"].dropna().unique():
        sub = vm[vm["toss_decision"].str.lower() == str(decision).lower()]
        if sub.empty:
            continue
        toss_win_matches = sub[sub["toss_winner"] == sub["match_winner"]]
        win_pct = len(toss_win_matches) / len(sub) * 100 if len(sub) else 0
        results.append(
            {
                "decision": str(decision),
                "matches": int(len(sub)),
                "toss_winner_win_pct": round(win_pct, 1),
            }
        )
    return {"venue": str(venue_name), "toss_impact": results}


def _player_in_match_stats(d: pd.DataFrame, player: str) -> dict[str, float]:
    bat = d[d["batter"] == player]
    bowl = d[d["bowler"] == player]
    legal_bat = _legal_deliveries(bat)
    runs = int(bat["runs"].sum())
    balls = len(legal_bat)
    wkts = int(bowl["is_wicket"].sum())
    bowl_runs = int(bowl["total_runs"].sum())
    legal_bowl = _legal_deliveries(bowl)
    overs = max(len(legal_bowl) / 6.0, 0.5)
    try:
        ps = player_stats(player)
        form = ps["form_trajectory"][-1]["form_score"] if ps["form_trajectory"] else 50
    except KeyError:
        form = 50.0
    return {
        "runs": runs,
        "balls": balls,
        "wickets": wkts,
        "economy": bowl_runs / overs,
        "form": form,
    }


def fantasy_scores(match_id: int) -> list[dict[str, Any]]:
    _ensure_loaded()
    m = _match_row(match_id)
    d = _deliveries_for_match(match_id)
    players = set(d["batter"].dropna()) | set(d["bowler"].dropna())
    venue = str(m["venue"])

    venue_del = deliveries_df[
        deliveries_df["venue"].astype(str).str.contains(venue[:15], case=False, na=False)
    ]
    venue_avg = float(venue_del["runs"].mean()) if not venue_del.empty else 6.0

    ranked = []
    for p in players:
        if pd.isna(p):
            continue
        p = str(p)
        ms = _player_in_match_stats(d, p)
        fifties = 8 if ms["runs"] >= 50 else 0
        hundreds = 16 if ms["runs"] >= 100 else 0
        econ_bonus = 10 if ms["wickets"] > 0 and ms["economy"] < 7 else 0
        score = (
            ms["runs"] * 1
            + ms["wickets"] * 25
            + ms["form"] * 0.3
            + (venue_avg / 6.0) * 10
            + fifties
            + hundreds
            + econ_bonus
        )
        ranked.append(
            {
                "player": p,
                "fantasy_score": round(score, 1),
                "form": round(ms["form"], 1),
                "runs": int(ms["runs"]),
                "wickets": int(ms["wickets"]),
            }
        )
    ranked.sort(key=lambda x: x["fantasy_score"], reverse=True)
    return ranked


def search_players(q: str = "") -> list[str]:
    _ensure_loaded()
    batters = deliveries_df["batter"].dropna().unique().tolist()
    bowlers = deliveries_df["bowler"].dropna().unique().tolist()
    all_p = sorted(set(batters) | set(bowlers))
    if not q:
        return all_p[:50]
    ql = q.lower()
    return [p for p in all_p if ql in str(p).lower()][:30]


def simulate_scenario(
    match_id: int,
    over: int,
    remove_wicket: bool = False,
    new_batsman: str | None = None,
) -> dict[str, Any]:
    _ensure_loaded()
    d = _deliveries_for_match(match_id)
    chasing = d[d["innings"] == 2]
    first_inn = d[d["innings"] == 1]
    target = int(first_inn["total_runs"].sum()) + 1 if not first_inn.empty else 161

    chase_until = chasing[chasing["over_num"] <= over]
    runs = int(chase_until["total_runs"].sum()) if not chase_until.empty else 0
    wkts = int(chase_until["is_wicket"].sum()) if not chase_until.empty else 0
    if remove_wicket:
        wkts = max(wkts - 1, 0)

    overs_done = over + 1 if over < 19 else 20.0
    overs_left = max(20.0 - overs_done, 0.1)
    phase = "death" if over >= 15 else "middle" if over >= 5 else "powerplay"
    phase_rr = {"powerplay": 8.5, "middle": 7.8, "death": 11.2}
    pos_factor = 1.0 + (wkts * 0.05)
    projected = int(runs + phase_rr[phase] * overs_left * pos_factor)
    return {
        "match_id": match_id,
        "over": over,
        "projected_total": projected,
        "runs": runs,
        "wickets": wkts,
        "target": target,
        "runs_needed": max(target - runs, 0),
        "new_batsman": new_batsman,
        "phase": phase,
    }


def match_analysis(match_id: int, team: str) -> dict[str, Any]:
    """Simplified per-team breakdown for one match."""
    _ensure_loaded()
    m = _match_row(match_id)
    d = _deliveries_for_match(match_id)
    team1, team2 = str(m["team1"]), str(m["team2"])
    team_name = _resolve_team_in_match(team, team1, team2)
    opponent = team2 if team_name == team1 else team1
    winner = str(m.get("match_winner", ""))

    bat_inn = d[d["batting_team"] == team_name]
    bowl_inn = d[d["bowling_team"] == team_name]

    innings_bat = None
    innings_bowl = None
    for inn in sorted(d["innings"].unique()):
        inn_d = d[d["innings"] == inn]
        if inn_d["batting_team"].iloc[0] == team_name:
            innings_bat = int(inn)
        else:
            innings_bowl = int(inn)

    bat_runs = int(bat_inn["total_runs"].sum()) if not bat_inn.empty else 0
    bat_wkts = int(bat_inn["is_wicket"].sum()) if not bat_inn.empty else 0
    bat_overs = _overs_bowled(bat_inn)
    bat_rr = round(bat_runs / max(bat_overs, 0.1), 2)
    legal_bat = _legal_deliveries(bat_inn)
    bat_boundaries = int(bat_inn["is_boundary"].sum())
    bat_dots = int(legal_bat["is_dot"].sum()) if not legal_bat.empty else 0
    bat_balls = len(legal_bat)

    bowl_runs = int(bowl_inn["total_runs"].sum()) if not bowl_inn.empty else 0
    bowl_wkts = int(bowl_inn["is_wicket"].sum()) if not bowl_inn.empty else 0
    legal_bowl = _legal_deliveries(bowl_inn)
    bowl_overs = max(len(legal_bowl) / 6.0, 0.5)
    bowl_econ = round(bowl_runs / bowl_overs, 2)

    top_batters = []
    if not bat_inn.empty:
        for batter in bat_inn["batter"].dropna().unique():
            bdf = bat_inn[bat_inn["batter"] == batter]
            legal = _legal_deliveries(bdf)
            runs = int(bdf["runs"].sum())
            balls = len(legal)
            top_batters.append(
                {
                    "name": str(batter),
                    "runs": runs,
                    "balls": balls,
                    "strike_rate": round(runs / max(balls, 1) * 100, 1),
                }
            )
        top_batters = sorted(top_batters, key=lambda x: x["runs"], reverse=True)[:5]

    top_bowlers = []
    if not bowl_inn.empty:
        for bowler in bowl_inn["bowler"].dropna().unique():
            bdf = bowl_inn[bowl_inn["bowler"] == bowler]
            legal = _legal_deliveries(bdf)
            runs = int(bdf["total_runs"].sum())
            wkts = int(bdf["is_wicket"].sum())
            overs = max(len(legal) / 6.0, 0.5)
            top_bowlers.append(
                {
                    "name": str(bowler),
                    "wickets": wkts,
                    "runs": runs,
                    "economy": round(runs / overs, 2),
                }
            )
        top_bowlers = sorted(
            top_bowlers, key=lambda x: (x["wickets"], -x["economy"]), reverse=True
        )[:5]

    over_runs = []
    if not bat_inn.empty:
        for over in range(int(bat_inn["over_num"].max()) + 1):
            od = bat_inn[bat_inn["over_num"] == over]
            over_runs.append(
                {"over": over + 1, "runs": int(od["total_runs"].sum()), "wickets": int(od["is_wicket"].sum())}
            )

    phases = {}
    for ph in ["powerplay", "middle", "death"]:
        ph_bat = bat_inn[bat_inn["phase"] == ph] if not bat_inn.empty else pd.DataFrame()
        ph_bowl = bowl_inn[bowl_inn["phase"] == ph] if not bowl_inn.empty else pd.DataFrame()
        lb = _legal_deliveries(ph_bat)
        lbowl = _legal_deliveries(ph_bowl)
        phases[ph] = {
            "batting_runs": int(ph_bat["runs"].sum()) if not ph_bat.empty else 0,
            "batting_sr": round(
                int(ph_bat["runs"].sum()) / max(len(lb), 1) * 100, 1
            )
            if not ph_bat.empty
            else 0,
            "bowling_economy": round(
                int(ph_bowl["total_runs"].sum()) / max(len(lbowl) / 6.0, 0.5), 2
            )
            if not ph_bowl.empty
            else 0,
            "wickets": int(ph_bowl["is_wicket"].sum()) if not ph_bowl.empty else 0,
        }

    best_over = max(over_runs, key=lambda x: x["runs"]) if over_runs else None
    worst_over = min(over_runs, key=lambda x: x["runs"]) if over_runs else None

    margin = ""
    if winner == team_name:
        margin = "Won"
    elif winner and winner != team_name:
        margin = "Lost"
    else:
        margin = "No result"

    chase_team = _chasing_team(match_id)
    is_chase = team_name == chase_team

    return {
        "match_id": match_id,
        "team": team_name,
        "opponent": opponent,
        "venue": str(m["venue"]),
        "date": str(m["date"]),
        "winner": winner,
        "result": margin,
        "toss_winner": str(m.get("toss_winner", "")),
        "toss_decision": str(m.get("toss_decision", "")),
        "innings_batted": innings_bat,
        "batting": {
            "runs": bat_runs,
            "wickets": bat_wkts,
            "overs": round(bat_overs, 1),
            "run_rate": bat_rr,
            "boundaries": bat_boundaries,
            "dot_balls": bat_dots,
            "strike_rate": round(bat_runs / max(bat_balls, 1) * 100, 1),
        },
        "bowling": {
            "runs_conceded": bowl_runs,
            "wickets": bowl_wkts,
            "economy": bowl_econ,
            "overs": round(bowl_overs, 1),
        },
        "top_batters": top_batters,
        "top_bowlers": top_bowlers,
        "over_by_over": over_runs,
        "phases": phases,
        "best_over": best_over,
        "worst_over": worst_over,
        "is_chase": is_chase,
        "pressure": pressure_index(match_id, team=team_name),
    }


def stat_benchmark(stat_key: str, value: float) -> dict[str, str]:
    benchmarks = {
        "strike_rate": (130, "batsmen"),
        "economy": (8.0, "bowlers"),
        "boundary_pct": (15, "batsmen"),
        "dot_ball_pct": (40, "bowlers"),
        "rrr": (10.0, "chases"),
        "pressure": (0.5, "overs"),
        "form_score": (60, "players"),
        "fantasy_score": (50, "fantasy XI"),
    }
    key = stat_key.lower().replace(" ", "_")
    better_high = key not in ("economy", "dot_ball_pct", "pressure", "rrr")
    default = (100, "the dataset")
    bench_val, cohort = benchmarks.get(key, default)
    if better_high:
        pct = min(99, max(1, int(50 + (value - bench_val) * 3)))
    else:
        pct = min(99, max(1, int(50 - (value - bench_val) * 4)))
    return {
        "stat": stat_key,
        "value": str(value),
        "explanation": (
            f"{stat_key.replace('_', ' ').title()} of {value} — "
            f"{'better' if pct >= 50 else 'below'} than about {pct}% of {cohort} in this dataset."
        ),
        "benchmark_pct": pct,
    }
