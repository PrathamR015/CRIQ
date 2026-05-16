import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx

import data

# Load .env at top level with absolute path
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        data.load_data()
    except FileNotFoundError as e:
        print(f"WARNING: {e}")
    yield


app = FastAPI(title="CRIQ API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"app": "CRIQ", "status": "ok"}


@app.get("/matches")
def get_matches():
    try:
        return data.list_matches()
    except Exception as e:
        raise HTTPException(500, str(e)) from e


@app.get("/match/{match_id}/summary")
def get_match_summary(match_id: int):
    try:
        return data.match_summary(match_id)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e


@app.get("/match/{match_id}/pressure")
def get_match_pressure(match_id: int, team: Optional[str] = Query(None)):
    try:
        return data.pressure_index(match_id, team=team)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e


@app.get("/match/{match_id}/analysis")
def get_match_analysis(match_id: int, team: str = Query(...)):
    try:
        return data.match_analysis(match_id, team)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e


@app.get("/player/{name}/stats")
def get_player_stats(name: str):
    try:
        return data.player_stats(name)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e


@app.get("/player/{name}/wagonwheel")
def get_wagon_wheel(
    name: str,
    bowler_type: Optional[str] = Query(None),
    phase: Optional[str] = Query(None),
):
    try:
        return data.wagon_wheel(name, bowler_type=bowler_type, phase=phase)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e


@app.get("/matchup")
def get_matchup(bat: str = Query(...), bowl: str = Query(...)):
    try:
        return data.matchup(bat, bowl)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e


@app.get("/team/{name}/phases")
def get_team_phases(name: str):
    try:
        return data.team_phases(name)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e


@app.get("/venue/{name}/toss")
def get_venue_toss(name: str):
    try:
        return data.venue_toss(name)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e


@app.get("/fantasy/{match_id}")
def get_fantasy(match_id: int):
    try:
        return data.fantasy_scores(match_id)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e


@app.get("/players/search")
def search_players(q: str = ""):
    return data.search_players(q)


@app.get("/match/{match_id}/simulate")
def simulate(
    match_id: int,
    over: int = Query(10, ge=0, le=19),
    remove_wicket: bool = False,
    new_batsman: Optional[str] = None,
):
    try:
        return data.simulate_scenario(
            match_id, over, remove_wicket=remove_wicket, new_batsman=new_batsman
        )
    except KeyError as e:
        raise HTTPException(404, str(e)) from e


@app.get("/stat/explain")
def explain_stat(stat: str, value: float):
    return data.stat_benchmark(stat, value)

class AIPrompt(BaseModel):
    prompt: str

@app.post("/ai/generate")
async def generate_ai(payload: AIPrompt):
    # Mock AI implementation to allow development without API keys
    p = payload.prompt.lower()
    
    # Mock Fan IQ Quiz
    if "quiz" in p:
        return {"response": """[
            {"question": "Who had the highest strike rate in this match?", "options": ["A. Top Batter", "B. Opener", "C. Finisher", "D. Captain"], "answer": "C. Finisher", "explanation": "The finisher scored 30 runs in just 10 balls at a strike rate of 300."},
            {"question": "How many wickets did the leading bowler take?", "options": ["A. 1", "B. 2", "C. 3", "D. 4"], "answer": "C. 3", "explanation": "The leading bowler finished with figures of 3/24 in 4 overs."},
            {"question": "Which team won the toss?", "options": ["A. Team 1", "B. Team 2", "C. Abandoned", "D. Tie"], "answer": "A. Team 1", "explanation": "Team 1 won the toss and elected to bat first."},
            {"question": "What was the powerplay score?", "options": ["A. 45/1", "B. 52/0", "C. 38/2", "D. 60/1"], "answer": "B. 52/0", "explanation": "The openers provided a solid start scoring 52 runs without losing a wicket in the first 6 overs."}
        ]"""}

    # Mock Match Story / Commentary
    if "journalist" in p or "commentator" in p:
        return {"response": "The match was a thrilling encounter that kept fans on the edge of their seats. Momentum shifted multiple times as both teams displayed exceptional skill and determination. Ultimately, the superior execution in the death overs proved to be the deciding factor in this contest."}

    # Mock Stat Explainer
    if "explain" in p:
        return {"response": "This statistic represents a crucial metric in modern cricket analytics. It indicates the player's efficiency and impact on the game's current phase, comparing well against the seasonal averages for this role."}

    return {"response": "Mock insight generated successfully for the requested data."}

