import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

export interface Match {
  id: number;
  team1: string;
  team2: string;
  season: number;
  venue: string;
  date: string;
}

export interface MatchSummary {
  match_id: number;
  team1: string;
  team2: string;
  venue: string;
  winner: string;
  player_of_match?: string;
  innings: {
    innings: number;
    team: string;
    runs: number;
    wickets: number;
    overs: number;
    batting?: { batter: string; runs: number; balls: number; fours: number; sixes: number; strike_rate: number; dismissed: boolean }[];
    bowling?: { bowler: string; overs: number; runs: number; wickets: number; economy: number }[];
  }[];
  scorecard: {
    current_score: number;
    wickets: number;
    target: number;
    overs_completed: number;
    rrr: number;
    run_rate: number;
    projected_total: number;
  };
  win_probability: { over: number; win_pct: number }[];
}

export interface PressurePoint {
  over: number;
  pressure: number;
  dot_pct?: number;
  boundary_drought?: number;
  wkts_cluster?: number;
}

export interface PlayerStats {
  name: string;
  matches: number;
  runs: number;
  strike_rate: number;
  average: number;
  boundary_pct: number;
  dot_ball_pct: number;
  form_trajectory: { match_id: number; form_score: number; index: number }[];
  economy: number;
  wickets: number;
}

export interface WagonShot {
  x: number;
  y: number;
  runs: number;
  zone: string;
  over: number;
  bowler: string;
}

export interface MatchupResult {
  batsman: string;
  bowler: string;
  balls: number;
  runs: number;
  dismissals: number;
  average: number;
  strike_rate: number;
  pitch_zones: { x: number; y: number; kind: string; runs?: number }[];
}

export interface TeamPhases {
  team: string;
  batting: Record<string, { strike_rate: number; runs: number }>;
  bowling: Record<string, { economy: number; wickets: number }>;
  acceleration_overs: { match_id: number; over: number; runs: number; match_avg: number }[];
}

export interface FantasyPlayer {
  player: string;
  fantasy_score: number;
  form: number;
  runs: number;
  wickets: number;
}

export interface MatchAnalysis {
  match_id: number;
  team: string;
  opponent: string;
  venue: string;
  date: string;
  winner: string;
  result: string;
  toss_winner: string;
  toss_decision: string;
  innings_batted: number | null;
  is_chase: boolean;
  batting: {
    runs: number;
    wickets: number;
    overs: number;
    run_rate: number;
    boundaries: number;
    dot_balls: number;
    strike_rate: number;
  };
  bowling: {
    runs_conceded: number;
    wickets: number;
    economy: number;
    overs: number;
  };
  top_batters: { name: string; runs: number; balls: number; strike_rate: number }[];
  top_bowlers: { name: string; wickets: number; runs: number; economy: number }[];
  over_by_over: { over: number; runs: number; wickets: number }[];
  phases: Record<string, { batting_runs: number; batting_sr: number; bowling_economy: number; wickets: number }>;
  best_over: { over: number; runs: number } | null;
  worst_over: { over: number; runs: number } | null;
  pressure: PressurePoint[];
}

export const fetchMatchAnalysis = (matchId: number, team: string) =>
  api
    .get<MatchAnalysis>(`/match/${matchId}/analysis`, {
      params: { team },
    })
    .then((r) => r.data);

export const fetchMatches = () => api.get<Match[]>('/matches').then((r) => r.data);
export const fetchMatchSummary = (id: number) =>
  api.get<MatchSummary>(`/match/${id}/summary`).then((r) => r.data);
export const fetchPressure = (id: number, team?: string) =>
  api
    .get<PressurePoint[]>(`/match/${id}/pressure`, { params: team ? { team } : {} })
    .then((r) => r.data);
export const fetchPlayerStats = (name: string) =>
  api.get<PlayerStats>(`/player/${encodeURIComponent(name)}/stats`).then((r) => r.data);
export const fetchWagonWheel = (name: string, bowlerType?: string, phase?: string) =>
  api
    .get<WagonShot[]>(`/player/${encodeURIComponent(name)}/wagonwheel`, {
      params: { bowler_type: bowlerType, phase },
    })
    .then((r) => r.data);
export const fetchMatchup = (bat: string, bowl: string) =>
  api.get<MatchupResult>('/matchup', { params: { bat, bowl } }).then((r) => r.data);
export const fetchTeamPhases = (team: string) =>
  api.get<TeamPhases>(`/team/${encodeURIComponent(team)}/phases`).then((r) => r.data);
export const fetchVenueToss = (venue: string) =>
  api.get<{ venue: string; toss_impact: { decision: string; matches: number; toss_winner_win_pct: number }[] }>(
    `/venue/${encodeURIComponent(venue)}/toss`,
  ).then((r) => r.data);
export const fetchFantasy = (matchId: number) =>
  api.get<FantasyPlayer[]>(`/fantasy/${matchId}`).then((r) => r.data);
export const searchPlayers = (q: string) =>
  api.get<string[]>('/players/search', { params: { q } }).then((r) => r.data);
export const simulateMatch = (
  matchId: number,
  over: number,
  removeWicket: boolean,
  newBatsman?: string,
) =>
  api
    .get('/match/' + matchId + '/simulate', {
      params: { over, remove_wicket: removeWicket, new_batsman: newBatsman },
    })
    .then((r) => r.data);
export const explainStat = (stat: string, value: number) =>
  api.get<{ stat: string; value: string; explanation: string; benchmark_pct: number }>('/stat/explain', {
    params: { stat, value },
  }).then((r) => r.data);

export default api;
