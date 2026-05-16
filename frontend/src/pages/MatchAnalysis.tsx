import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchMatchAnalysis, fetchMatches } from '../api/client';
import type { MatchAnalysis } from '../api/client';
import ErrorRetry from '../components/ErrorRetry';
import PressureBar from '../components/PressureBar';
import { CardSkeleton, ChartSkeleton } from '../components/LoadingSkeleton';
import { useStore } from '../store/useStore';
import { statExplanations } from '../components/StatBadge';

function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  let key = label.toLowerCase().replace(' ', '_');
  if (label === 'Runs conceded') key = 'runs';
  const explanation = statExplanations[key];

  return (
    <div className="group relative flex items-center justify-between border-b border-white/5 py-2 px-2 -mx-2 rounded transition-colors hover:bg-white/[0.02] last:border-0 cursor-default">
      <span className="text-sm text-white/50 border-b border-dashed border-white/30">{label}</span>
      <span className={`font-stat text-base ${highlight ? 'text-green' : 'text-white'}`}>{value}</span>
      
      {explanation && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="rounded bg-navy-light p-2 text-xs text-white shadow-xl border border-white/20 whitespace-normal normal-case tracking-normal font-sans text-left leading-relaxed">
            {explanation}
          </div>
          <div className="mx-auto h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white/20"></div>
        </div>
      )}
    </div>
  );
}

export default function MatchAnalysis() {
  const { matches, selectedMatchId, setMatches, setSelectedMatchId } = useStore();
  const [selectedTeam, setSelectedTeam] = useState('');
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentMatch = useMemo(
    () => matches.find((m) => m.id === selectedMatchId),
    [matches, selectedMatchId],
  );

  useEffect(() => {
    fetchMatches()
      .then((m) => {
        setMatches(m);
        if (!selectedMatchId && m.length) setSelectedMatchId(m[0].id);
      })
      .catch(() => setError('Could not load matches'));
  }, [setMatches, setSelectedMatchId, selectedMatchId]);

  useEffect(() => {
    if (currentMatch) {
      setSelectedTeam((prev) => {
        if (prev === currentMatch.team1 || prev === currentMatch.team2) return prev;
        return currentMatch.team1;
      });
    }
  }, [currentMatch?.id, currentMatch?.team1, currentMatch?.team2]);

  const load = useCallback(() => {
    if (!selectedMatchId || !selectedTeam) return;
    setLoading(true);
    setError('');
    fetchMatchAnalysis(selectedMatchId, selectedTeam)
      .then(setAnalysis)
      .catch(() => setError('Analysis unavailable for this match/team'))
      .finally(() => setLoading(false));
  }, [selectedMatchId, selectedTeam]);

  useEffect(() => {
    load();
  }, [load]);

  const phaseData = analysis
    ? [
        { name: 'PP', runs: analysis.phases.powerplay?.batting_runs ?? 0, econ: analysis.phases.powerplay?.bowling_economy ?? 0 },
        { name: 'Mid', runs: analysis.phases.middle?.batting_runs ?? 0, econ: analysis.phases.middle?.bowling_economy ?? 0 },
        { name: 'Death', runs: analysis.phases.death?.batting_runs ?? 0, econ: analysis.phases.death?.bowling_economy ?? 0 },
      ]
    : [];

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-semibold">Match Analysis</h2>
        <p className="text-sm text-white/50">Clear breakdown by match and team</p>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <select
          className="min-w-[220px] flex-1 rounded-lg border border-white/20 bg-navy-card px-3 py-2.5 text-sm"
          value={selectedMatchId ?? ''}
          onChange={(e) => setSelectedMatchId(Number(e.target.value))}
        >
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              #{m.id} · {m.team1} vs {m.team2}
            </option>
          ))}
        </select>

        {currentMatch && (
          <div className="flex rounded-lg border border-white/20 bg-navy-card p-1">
            {[currentMatch.team1, currentMatch.team2].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTeam(t)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                  selectedTeam === t
                    ? 'bg-green text-navy'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <ErrorRetry message={error} onRetry={load} />}

      {loading && !analysis ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CardSkeleton lines={6} />
          <ChartSkeleton />
        </div>
      ) : analysis ? (
        <div className="space-y-4">
          {/* Match header */}
          <div className="rounded-lg border border-green/30 bg-navy-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40">{analysis.venue}</p>
                <h3 className="mt-1 text-xl font-semibold">
                  {analysis.team} <span className="text-white/40">vs</span> {analysis.opponent}
                </h3>
                <p className="text-xs text-white/50">{analysis.date}</p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    analysis.result === 'Won'
                      ? 'bg-green/20 text-green'
                      : analysis.result === 'Lost'
                        ? 'bg-red/20 text-red'
                        : 'bg-amber/20 text-amber'
                  }`}
                >
                  {analysis.result}
                </span>
                {analysis.winner && (
                  <p className="mt-1 text-xs text-white/50">Winner: {analysis.winner}</p>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-white/40">
              Toss: {analysis.toss_winner} chose to {analysis.toss_decision}
              {analysis.is_chase ? ' · Chased' : ' · Batted first'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Batting card */}
            <div className="rounded-lg border border-white/10 bg-navy-card p-5">
              <h4 className="mb-3 font-stat text-sm text-green">Batting</h4>
              <StatRow label="Score" value={`${analysis.batting.runs}/${analysis.batting.wickets}`} highlight />
              <StatRow label="Overs" value={analysis.batting.overs} />
              <StatRow label="Run rate" value={analysis.batting.run_rate} />
              <StatRow label="Strike rate" value={analysis.batting.strike_rate} />
              <StatRow label="Boundaries" value={analysis.batting.boundaries} />
              <StatRow label="Dot balls" value={analysis.batting.dot_balls} />
            </div>

            {/* Bowling card */}
            <div className="rounded-lg border border-white/10 bg-navy-card p-5">
              <h4 className="mb-3 font-stat text-sm text-amber">Bowling</h4>
              <StatRow label="Runs conceded" value={analysis.bowling.runs_conceded} />
              <StatRow label="Wickets" value={analysis.bowling.wickets} highlight />
              <StatRow label="Economy" value={analysis.bowling.economy} />
              <StatRow label="Overs" value={analysis.bowling.overs} />
            </div>
          </div>

          {/* Key overs */}
          {(analysis.best_over || analysis.worst_over) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {analysis.best_over && (
                <div className="rounded-lg border border-green/20 bg-green/5 p-4">
                  <p className="text-xs text-green">Best over</p>
                  <p className="font-stat text-lg">
                    Over {analysis.best_over.over} — {analysis.best_over.runs} runs
                  </p>
                </div>
              )}
              {analysis.worst_over && (
                <div className="rounded-lg border border-red/20 bg-red/5 p-4">
                  <p className="text-xs text-red">Quietest over</p>
                  <p className="font-stat text-lg">
                    Over {analysis.worst_over.over} — {analysis.worst_over.runs} runs
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Over chart */}
          {analysis.over_by_over.length > 0 && (
            <div className="rounded-lg border border-white/10 bg-navy-card p-5">
              <h4 className="mb-3 font-stat text-sm text-green">Runs per over (batting)</h4>
              <div className="chart-animate h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.over_by_over}>
                    <XAxis dataKey="over" stroke="#ffffff40" tick={{ fill: '#fff8', fontSize: 10 }} />
                    <YAxis stroke="#ffffff40" tick={{ fill: '#fff8', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#161d32', border: '1px solid #00FF8740' }} />
                    <Bar dataKey="runs" fill="#00FF87" radius={[2, 2, 0, 0]} animationDuration={300} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Phase summary */}
          <div className="rounded-lg border border-white/10 bg-navy-card p-5">
            <h4 className="mb-3 font-stat text-sm text-green">Phase summary</h4>
            <div className="chart-animate h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={phaseData}>
                  <XAxis dataKey="name" stroke="#ffffff40" tick={{ fill: '#fff8', fontSize: 11 }} />
                  <YAxis stroke="#ffffff40" tick={{ fill: '#fff8', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#161d32', border: '1px solid #00FF8740' }} />
                  <Bar dataKey="runs" name="Runs scored" fill="#00FF87" animationDuration={300} />
                  <Bar dataKey="econ" name="Econ conceded" fill="#FFB547" animationDuration={300} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top performers */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-navy-card p-5">
              <h4 className="mb-3 text-sm font-medium text-white/70">Top batters</h4>
              <ul className="space-y-2">
                {analysis.top_batters.map((b) => (
                  <li key={b.name} className="flex justify-between text-sm">
                    <span>{b.name}</span>
                    <span className="font-stat text-green">
                      {b.runs} ({b.balls}) · SR {b.strike_rate}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-white/10 bg-navy-card p-5">
              <h4 className="mb-3 text-sm font-medium text-white/70">Top bowlers</h4>
              <ul className="space-y-2">
                {analysis.top_bowlers.map((b) => (
                  <li key={b.name} className="flex justify-between text-sm">
                    <span>{b.name}</span>
                    <span className="font-stat text-amber">
                      {b.wickets} wkts · {b.runs} runs · Econ {b.economy}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Pressure */}
          <div className="rounded-lg border border-white/10 bg-navy-card p-5">
            <h4 className="mb-2 font-stat text-sm text-green">Batting pressure by over</h4>
            <PressureBar data={analysis.pressure} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
