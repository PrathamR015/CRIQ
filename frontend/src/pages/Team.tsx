import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchMatches, fetchTeamPhases, fetchVenueToss } from '../api/client';
import type { TeamPhases } from '../api/client';
import ErrorRetry from '../components/ErrorRetry';
import { ChartSkeleton } from '../components/LoadingSkeleton';
import { useStore } from '../store/useStore';

const TEAMS = ['RCB', 'MI', 'CSK', 'KKR', 'SRH', 'RR', 'PBKS', 'GT', 'DC', 'LSG'];

export default function Team() {
  const { selectedTeam, setSelectedTeam, matches } = useStore();
  const [phases, setPhases] = useState<TeamPhases | null>(null);
  const [tossData, setTossData] = useState<{ decision: string; toss_winner_win_pct: number; matches: number }[]>([]);
  const [venue, setVenue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!matches.length) fetchMatches().then(useStore.getState().setMatches);
  }, [matches.length]);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const v = venue || matches[0]?.venue || 'Wankhede';
    Promise.all([
      fetchTeamPhases(selectedTeam),
      fetchVenueToss(v).catch(() => ({ toss_impact: [] })),
    ])
      .then(([p, t]) => {
        setPhases(p);
        setTossData(t.toss_impact);
      })
      .catch(() => setError('Failed to load team strategy'))
      .finally(() => setLoading(false));
  }, [selectedTeam, venue, matches]);

  useEffect(() => {
    load();
  }, [load]);

  const phaseChartData = phases
    ? ['powerplay', 'middle', 'death'].map((ph) => ({
        phase: ph.toUpperCase(),
        economy: phases.bowling[ph]?.economy ?? 0,
        strike_rate: phases.batting[ph]?.strike_rate ?? 0,
      }))
    : [];

  const availableTeams = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.team1) set.add(m.team1);
      if (m.team2) set.add(m.team2);
    });
    const list = Array.from(set);
    return list.length > 0 ? list.sort() : TEAMS;
  }, [matches]);

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-semibold">Team Strategy</h2>
        <p className="text-sm text-white/50">Season-wide phase stats & toss trends</p>
      </header>

      <div className="mb-4 rounded-lg border border-white/10 bg-navy-card/50 px-4 py-3 text-sm text-white/60">
        For a single-match breakdown with team toggle, use{' '}
        <Link to="/match" className="text-green underline">
          Match Analysis
        </Link>
        .
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          className="rounded border border-white/20 bg-navy-card px-3 py-2 text-sm"
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
        >
          {availableTeams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="min-w-[200px] flex-1 rounded border border-white/20 bg-navy-card px-3 py-2 text-sm"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        >
          <option value="">Default venue</option>
          {[...new Set(matches.map((m) => m.venue))].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorRetry message={error} onRetry={load} />}
      {loading && <ChartSkeleton />}

      {!loading && phases && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-navy-card p-5">
            <h3 className="mb-3 font-stat text-sm text-green">Toss impact at venue</h3>
            <div className="chart-animate h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tossData}>
                  <XAxis dataKey="decision" stroke="#ffffff40" tick={{ fill: '#fff8', fontSize: 10 }} />
                  <YAxis stroke="#ffffff40" tick={{ fill: '#fff8', fontSize: 10 }} unit="%" />
                  <Tooltip contentStyle={{ background: '#161d32', border: '1px solid #00FF8740' }} />
                  <Bar dataKey="toss_winner_win_pct" fill="#00FF87" name="Toss winner win %" animationDuration={300} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-navy-card p-5">
            <h3 className="mb-3 font-stat text-sm text-green">
              {phases.team} — batting SR vs bowling economy by phase
            </h3>
            <div className="chart-animate h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={phaseChartData}>
                  <XAxis dataKey="phase" stroke="#ffffff40" tick={{ fill: '#fff8', fontSize: 10 }} />
                  <YAxis stroke="#ffffff40" tick={{ fill: '#fff8', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#161d32', border: '1px solid #00FF8740' }} />
                  <Legend />
                  <Bar dataKey="economy" fill="#FFB547" name="Economy" animationDuration={300} />
                  <Bar dataKey="strike_rate" fill="#00FF87" name="Strike rate" animationDuration={300} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-navy-card p-5 lg:col-span-2">
            <h3 className="mb-2 font-stat text-sm text-amber">Innings acceleration (gear-shift overs)</h3>
            {phases.acceleration_overs.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {phases.acceleration_overs.map((a) => (
                  <li
                    key={`${a.match_id}-${a.over}`}
                    className="rounded border border-amber/30 bg-amber/10 px-3 py-2 text-sm"
                  >
                    Match #{a.match_id} · Over {a.over}: <strong>{a.runs} runs</strong> (
                    {(a.runs / a.match_avg).toFixed(1)}× avg {a.match_avg})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-white/40">No acceleration overs above 1.5× match run-rate.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
