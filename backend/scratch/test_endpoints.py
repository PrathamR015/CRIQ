import sys
sys.path.append('backend')
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_all():
    print("Testing /")
    r = client.get("/")
    print("GET / ->", r.status_code, r.json())

    print("Testing /matches")
    r = client.get("/matches")
    print("GET /matches ->", r.status_code, len(r.json()) if r.status_code==200 else r.text)
    
    if r.status_code == 200 and len(r.json()) > 0:
        matches = r.json()
        match_id = matches[0]["id"]
        team1 = matches[0]["team1"]
        
        print(f"Testing /match/{match_id}/summary")
        r_sum = client.get(f"/match/{match_id}/summary")
        print(f"GET /match/{match_id}/summary ->", r_sum.status_code)
        if r_sum.status_code != 200:
            print("Error summary:", r_sum.text)

        print(f"Testing /match/{match_id}/pressure")
        r_press = client.get(f"/match/{match_id}/pressure")
        print(f"GET /match/{match_id}/pressure ->", r_press.status_code)
        if r_press.status_code != 200:
            print("Error pressure:", r_press.text)

        print(f"Testing /match/{match_id}/analysis?team={team1}")
        r_ana = client.get(f"/match/{match_id}/analysis", params={"team": team1})
        print(f"GET /match/{match_id}/analysis ->", r_ana.status_code)
        if r_ana.status_code != 200:
            print("Error analysis:", r_ana.text)

        print(f"Testing /fantasy/{match_id}")
        r_fan = client.get(f"/fantasy/{match_id}")
        print(f"GET /fantasy/{match_id} ->", r_fan.status_code)
        if r_fan.status_code != 200:
            print("Error fantasy:", r_fan.text)

        print(f"Testing /match/{match_id}/simulate")
        r_sim = client.get(f"/match/{match_id}/simulate?over=10")
        print(f"GET /match/{match_id}/simulate ->", r_sim.status_code)
        if r_sim.status_code != 200:
            print("Error simulate:", r_sim.text)

        print("Testing /players/search")
        r_ps = client.get("/players/search?q=")
        print("GET /players/search ->", r_ps.status_code, len(r_ps.json()) if r_ps.status_code==200 else r_ps.text)
        
        if r_ps.status_code == 200 and len(r_ps.json()) > 0:
            player_name = r_ps.json()[0]
            print(f"Testing /player/{player_name}/stats")
            r_pstat = client.get(f"/player/{player_name}/stats")
            print(f"GET /player/{player_name}/stats ->", r_pstat.status_code)
            if r_pstat.status_code != 200:
                print("Error player stats:", r_pstat.text)

            print(f"Testing /player/{player_name}/wagonwheel")
            r_wagon = client.get(f"/player/{player_name}/wagonwheel")
            print(f"GET /player/{player_name}/wagonwheel ->", r_wagon.status_code)
            if r_wagon.status_code != 200:
                print("Error wagonwheel:", r_wagon.text)

            if len(r_ps.json()) > 1:
                p2 = r_ps.json()[1]
                print(f"Testing /matchup?bat={player_name}&bowl={p2}")
                r_mup = client.get(f"/matchup?bat={player_name}&bowl={p2}")
                print(f"GET /matchup ->", r_mup.status_code)
                if r_mup.status_code != 200:
                    print("Error matchup:", r_mup.text)

        print(f"Testing /team/{team1}/phases")
        r_team = client.get(f"/team/{team1}/phases")
        print(f"GET /team/{team1}/phases ->", r_team.status_code)
        if r_team.status_code != 200:
            print("Error team phases:", r_team.text)

        venue = matches[0]["venue"]
        print(f"Testing /venue/{venue}/toss")
        r_venue = client.get(f"/venue/{venue}/toss")
        print(f"GET /venue/{venue}/toss ->", r_venue.status_code)
        if r_venue.status_code != 200:
            print("Error venue toss:", r_venue.text)

if __name__ == "__main__":
    test_all()
