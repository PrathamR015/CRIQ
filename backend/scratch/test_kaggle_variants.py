import sys
import pandas as pd
import numpy as np
from pathlib import Path

sys.path.append('backend')
import data

def test_kaggle_variant_1():
    print("--- Testing Kaggle Variant 1 (Standard 2008-2023 IPL Dataset) ---")
    matches = pd.DataFrame({
        "id": [1, 2],
        "season": [2020, 2020],
        "city": ["Mumbai", "Abu Dhabi"],
        "date": ["2020-09-19", "2020-09-20"],
        "team1": ["Mumbai Indians", "Delhi Capitals"],
        "team2": ["Chennai Super Kings", "Kings XI Punjab"],
        "toss_winner": ["Chennai Super Kings", "Kings XI Punjab"],
        "toss_decision": ["field", "field"],
        "result": ["normal", "tie"],
        "dl_applied": [0, 0],
        "winner": ["Chennai Super Kings", "Delhi Capitals"],
        "win_by_runs": [0, 0],
        "win_by_wickets": [5, 0],
        "player_of_match": ["AT Rayudu", "MP Stoinis"],
        "venue": ["Sheikh Zayed Stadium", "Dubai International Cricket Stadium"]
    })

    deliveries = pd.DataFrame({
        "match_id": [1, 1, 1, 1, 1],
        "inning": [1, 1, 1, 1, 1],
        "batting_team": ["Mumbai Indians", "Mumbai Indians", "Mumbai Indians", "Mumbai Indians", "Mumbai Indians"],
        "bowling_team": ["Chennai Super Kings", "Chennai Super Kings", "Chennai Super Kings", "Chennai Super Kings", "Chennai Super Kings"],
        "over": [1, 1, 1, 1, 1],
        "ball": [1, 2, 3, 4, 5],
        "batsman": ["RG Sharma", "RG Sharma", "Q de Kock", "Q de Kock", "Q de Kock"],
        "non_striker": ["Q de Kock", "Q de Kock", "RG Sharma", "RG Sharma", "RG Sharma"],
        "bowler": ["DL Chahar", "DL Chahar", "DL Chahar", "DL Chahar", "DL Chahar"],
        "is_super_over": [0, 0, 0, 0, 0],
        "wide_runs": [0, 0, 0, 0, 0],
        "bye_runs": [0, 0, 0, 0, 0],
        "legbye_runs": [0, 0, 0, 0, 0],
        "noball_runs": [0, 0, 0, 0, 0],
        "penalty_runs": [0, 0, 0, 0, 0],
        "batsman_runs": [4, 1, 2, 0, 0],
        "extra_runs": [0, 0, 0, 0, 0],
        "total_runs": [4, 1, 2, 0, 0],
        "player_dismissed": [np.nan, np.nan, np.nan, "Q de Kock", np.nan],
        "dismissal_kind": [np.nan, np.nan, np.nan, "caught", np.nan],
        "fielder": [np.nan, np.nan, np.nan, "F du Plessis", np.nan]
    })

    # Temporarily override paths
    data.matches_df = matches
    data.deliveries_df = deliveries

    try:
        # Call normalizer / loader logic
        # We simulate load_data mapping logic:
        df_m = matches.copy()
        df_d = deliveries.copy()
        
        # Test if data.py normalization logic works on df_m and df_d
        data.MATCHES_PATH = Path("dummy_matches.csv") # avoid reading file directly
        data.DELIVERIES_PATH = Path("dummy_deliveries.csv")
        
        # Let's save mock files and call load_data
        matches.to_csv("backend/scratch/mock_matches.csv", index=False)
        deliveries.to_csv("backend/scratch/mock_deliveries.csv", index=False)
        
        data.MATCHES_PATH = Path("backend/scratch/mock_matches.csv")
        data.DELIVERIES_PATH = Path("backend/scratch/mock_deliveries.csv")
        
        data.load_data()
        print("Kaggle Variant 1 load_data SUCCESS!")
        
        # Test endpoints
        m_list = data.list_matches()
        print("list_matches:", m_list[:1])
        summary = data.match_summary(1)
        print("match_summary SUCCESS!")
        analysis = data.match_analysis(1, "Mumbai Indians")
        print("match_analysis SUCCESS!")
    except Exception as e:
        print("Kaggle Variant 1 ERROR:", type(e), e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_kaggle_variant_1()
