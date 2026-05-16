import { useCallback, useEffect, useState } from 'react';
import { fetchMatchup, fetchPlayerStats, searchPlayers } from '../api/client';
import type { MatchupResult, PlayerStats } from '../api/client';
import ErrorRetry from '../components/ErrorRetry';
import MatchupCard from '../components/MatchupCard';
import StatBadge from '../components/StatBadge';
import { CardSkeleton, ChartSkeleton } from '../components/LoadingSkeleton';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '../store/useStore';

interface Props {
  onExplain: (stat: string, value: number) => void;
}

export default function Player({ onExplain }: Props) {
  const { selectedPlayer, setSelectedPlayer } = useStore();
  const [query, setQuery] = useState(selectedPlayer || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [batInput, setBatInput] = useState('');
  const [bowlInput, setBowlInput] = useState('');
  const [matchup, setMatchup] = useState<MatchupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      searchPlayers(query).then(setSuggestions).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const loadPlayer = useCallback(
    (name: string) => {
      setLoading(true);
      setError('');
      setSelectedPlayer(name);
      fetchPlayerStats(name)
        .then((s) => {
          setStats(s);
          setQuery(s.name);
        })
        .catch(() => setError('Player not found'))
        .finally(() => setLoading(false));
    },
    [setSelectedPlayer],
  );

  useEffect(() => {
    if (selectedPlayer) loadPlayer(selectedPlayer);
  }, []);

  const runMatchup = () => {
    if (!batInput || !bowlInput) return;
    fetchMatchup(batInput, bowlInput)
      .then(setMatchup)
      .catch(() => setError('Matchup data unavailable'));
  };

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-semibold">Player Intelligence</h2>
        <p className="text-sm text-white/50">Career stats, form trajectory & head-to-head</p>
      </header>

      <div className="relative mb-6">
        <input
          type="search"
          placeholder="Search player..."
          className="w-full rounded-lg border border-white/20 bg-navy-card px-4 py-3"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadPlayer(query)}
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-white/10 bg-navy-light shadow-xl">
            {suggestions.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm hover:bg-green/10"
                  onClick={() => loadPlayer(p)}
                >
                  {p}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <ErrorRetry message={error} onRetry={() => loadPlayer(query)} />}

      {loading && <CardSkeleton lines={5} />}

      {stats && !loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-navy-card p-5">
            <h3 className="font-stat text-xl text-green">{stats.name}</h3>
            {stats.wickets > 0 && (
              <p className="mt-1 text-xs text-white/50">
                Bowler · {stats.wickets} wickets · Econ {stats.economy}
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StatBadge label="Matches" value={stats.matches} statKey="matches" onExplain={onExplain} />
              <StatBadge label="Runs" value={stats.runs} statKey="runs" onExplain={onExplain} />
              <StatBadge label="Strike Rate" value={stats.strike_rate} statKey="strike_rate" onExplain={onExplain} />
              <StatBadge label="Average" value={stats.average} statKey="average" onExplain={onExplain} />
              <StatBadge label="Boundary %" value={stats.boundary_pct} statKey="boundary_pct" onExplain={onExplain} />
              <StatBadge label="Dot %" value={stats.dot_ball_pct} statKey="dot_ball_pct" onExplain={onExplain} />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-navy-card p-5">
            <h3 className="mb-2 font-stat text-sm text-green">Form (last 5 innings)</h3>
            {stats.form_trajectory.length ? (
              <div className="chart-animate h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.form_trajectory}>
                    <XAxis dataKey="index" stroke="#ffffff40" tick={{ fill: '#fff8', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke="#ffffff40" tick={{ fill: '#fff8', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#161d32', border: '1px solid #00FF8740' }} />
                    <Line type="monotone" dataKey="form_score" stroke="#00FF87" strokeWidth={2} dot animationDuration={300} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ChartSkeleton />
            )}
          </div>
        </div>
      )}

      <section className="mt-8 rounded-lg border border-white/10 bg-navy-card p-5">
        <h3 className="font-stat text-green">Bowler vs Batsman</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            placeholder="Batsman"
            className="flex-1 rounded border border-white/20 bg-navy-light px-3 py-2 text-sm"
            value={batInput}
            onChange={(e) => setBatInput(e.target.value)}
          />
          <input
            placeholder="Bowler"
            className="flex-1 rounded border border-white/20 bg-navy-light px-3 py-2 text-sm"
            value={bowlInput}
            onChange={(e) => setBowlInput(e.target.value)}
          />
          <button
            type="button"
            onClick={runMatchup}
            className="rounded bg-green px-4 py-2 text-sm font-semibold text-navy"
          >
            Compare
          </button>
        </div>
        {matchup && (
          <div className="mt-4">
            <MatchupCard data={matchup} onExplain={onExplain} />
          </div>
        )}
      </section>
    </div>
  );
}
