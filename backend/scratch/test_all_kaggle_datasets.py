import sys
import pandas as pd
import numpy as np
from pathlib import Path

sys.path.append('backend')
import data

def test_variant(name, matches_df, deliveries_df):
    print(f"=== Testing {name} ===")
    matches_path = Path(f"backend/scratch/mock_{name}_matches.csv")
    deliveries_path = Path(f"backend/scratch/mock_{name}_deliveries.csv")
    
    matches_df.to_csv(matches_path, index=False)
    deliveries_df.to_csv(deliveries_path, index=False)
    
    data.MATCHES_PATH = matches_path
    data.DELIVERIES_PATH = deliveries_path
    
    data.load_data()
    print("load_data() SUCCESS")
    
    m_list = data.list_matches()
    print(f"Matches count: {len(m_list)}")
    if m_list:
        mid = m_list[0]["id"]
        team1 = m_list[0]["team1"]
        print(f"Testing match_summary for match {mid}:", data.match_summary(mid)["scorecard"])
        print(f"Testing pressure_index for match {mid}:", len(data.pressure_index(mid)))
        print(f"Testing match_analysis for match {mid}:", data.match_analysis(mid, team1)["result"])
        print(f"Testing fantasy_scores for match {mid}:", len(data.fantasy_scores(mid)))
    
    players = data.search_players("")
    print(f"Players count: {len(players)}")
    if players:
        p1 = players[0]
        print(f"Player stats for {p1}:", data.player_stats(p1)["runs"])
        print(f"Wagon wheel for {p1}:", len(data.wagon_wheel(p1)))
    print(f"=== {name} PASSED ===\n")

def main():
    # Variant 1: Standard Kaggle 2008-2020 IPL Dataset
    m1 = pd.DataFrame({
        "id": [1, 2],
        "season": [2020, 2021],
        "city": ["Mumbai", "Abu Dhabi"],
        "date": ["2020-09-19", "2021-04-09"],
        "team1": ["Mumbai Indians", "Royal Challengers Bangalore"],
        "team2": ["Chennai Super Kings", "Mumbai Indians"],
        "toss_winner": ["Chennai Super Kings", "Royal Challengers Bangalore"],
        "toss_decision": ["field", "field"],
        "result": ["normal", "normal"],
        "dl_applied": [0, 0],
        "winner": ["Chennai Super Kings", "Royal Challengers Bangalore"],
        "win_by_runs": [0, 0],
        "win_by_wickets": [5, 2],
        "player_of_match": ["AT Rayudu", "HV Patel"],
        "venue": ["Sheikh Zayed Stadium", "MA Chidambaram Stadium, Chepauk, Chennai"]
    })

    d1 = pd.DataFrame({
        "match_id": [1, 1, 1, 1, 1, 2, 2, 2],
        "inning": [1, 1, 1, 1, 2, 1, 1, 1],
        "batting_team": ["Mumbai Indians", "Mumbai Indians", "Mumbai Indians", "Mumbai Indians", "Chennai Super Kings", "Mumbai Indians", "Mumbai Indians", "Mumbai Indians"],
        "bowling_team": ["Chennai Super Kings", "Chennai Super Kings", "Chennai Super Kings", "Chennai Super Kings", "Mumbai Indians", "Royal Challengers Bangalore", "Royal Challengers Bangalore", "Royal Challengers Bangalore"],
        "over": [1, 1, 1, 1, 1, 1, 1, 20],
        "ball": [1, 2, 3, 4, 1, 1, 2, 6],
        "batsman": ["RG Sharma", "RG Sharma", "Q de Kock", "Q de Kock", "AT Rayudu", "CA Lynn", "CA Lynn", "KA Pollard"],
        "non_striker": ["Q de Kock", "Q de Kock", "RG Sharma", "RG Sharma", "F du Plessis", "RG Sharma", "RG Sharma", "HH Pandya"],
        "bowler": ["DL Chahar", "DL Chahar", "DL Chahar", "DL Chahar", "TA Boult", "Mohammed Siraj", "Mohammed Siraj", "HV Patel"],
        "is_super_over": [0, 0, 0, 0, 0, 0, 0, 0],
        "wide_runs": [0, 0, 0, 0, 0, 0, 0, 0],
        "bye_runs": [0, 0, 0, 0, 0, 0, 0, 0],
        "legbye_runs": [0, 0, 0, 0, 0, 0, 0, 0],
        "noball_runs": [0, 0, 0, 0, 0, 0, 0, 0],
        "penalty_runs": [0, 0, 0, 0, 0, 0, 0, 0],
        "batsman_runs": [4, 1, 2, 0, 6, 0, 4, 1],
        "extra_runs": [0, 0, 0, 0, 0, 0, 0, 0],
        "total_runs": [4, 1, 2, 0, 6, 0, 4, 1],
        "player_dismissed": [np.nan, np.nan, np.nan, "Q de Kock", np.nan, np.nan, np.nan, "KA Pollard"],
        "dismissal_kind": [np.nan, np.nan, np.nan, "caught", np.nan, np.nan, np.nan, "bowled"],
        "fielder": [np.nan, np.nan, np.nan, "F du Plessis", np.nan, np.nan, np.nan, np.nan]
    })
    test_variant("Kaggle_v1_Standard_IPL", m1, d1)

    # Variant 2: Cricsheet / Kaggle 2024 IPL Dataset
    m2 = pd.DataFrame({
        "match_id": [101, 102],
        "date": ["2023-03-31", "2023-04-01"],
        "venue": ["Narendra Modi Stadium, Ahmedabad", "Punjab Cricket Association IS Bindra Stadium, Mohali"],
        "team1": ["Gujarat Titans", "Punjab Kings"],
        "team2": ["Chennai Super Kings", "Kolkata Knight Riders"],
        "toss_winner": ["Gujarat Titans", "Kolkata Knight Riders"],
        "toss_decision": ["bowl", "bowl"],
        "match_winner": ["Gujarat Titans", "Punjab Kings"],
        "player_of_the_match": ["Rashid Khan", "Arshdeep Singh"]
    })

    d2 = pd.DataFrame({
        "match_no": [101, 101, 101, 101],
        "innings": [1, 1, 1, 1],
        "batting_team": ["Chennai Super Kings", "Chennai Super Kings", "Chennai Super Kings", "Chennai Super Kings"],
        "bowling_team": ["Gujarat Titans", "Gujarat Titans", "Gujarat Titans", "Gujarat Titans"],
        "over": [0.1, 0.2, 0.3, 0.4],
        "striker": ["DP Conway", "DP Conway", "RD Gaikwad", "RD Gaikwad"],
        "bowler": ["Mohammed Shami", "Mohammed Shami", "Mohammed Shami", "Mohammed Shami"],
        "runs_off_bat": [0, 0, 4, 6],
        "extras": [0, 0, 0, 0],
        "wide": [0, 0, 0, 0],
        "wicket_type": ["bowled", np.nan, np.nan, np.nan],
        "player_dismissed": ["DP Conway", np.nan, np.nan, np.nan]
    })
    test_variant("Kaggle_v2_Cricsheet", m2, d2)

if __name__ == "__main__":
    main()
