import { useCallback, useEffect, useState } from 'react';
import {
  fetchFantasy,
  fetchMatches,
  simulateMatch,
} from '../api/client';
import type { FantasyPlayer } from '../api/client';
import ErrorRetry from '../components/ErrorRetry';
import StatBadge from '../components/StatBadge';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { useStore } from '../store/useStore';

interface Props {
  onExplain: (stat: string, value: number) => void;
}

export default function FanTools({ onExplain }: Props) {
  const { matches, selectedMatchId, setMatches, setSelectedMatchId } = useStore();
  const [fantasy, setFantasy] = useState<FantasyPlayer[]>([]);
  const [simOver, setSimOver] = useState(10);
  const [removeWicket, setRemoveWicket] = useState(false);
  const [newBatsman, setNewBatsman] = useState('');
  const [simResult, setSimResult] = useState<{
    projected_total: number;
    runs: number;
    wickets: number;
    phase: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMatches()
      .then((m) => {
        setMatches(m);
        if (!selectedMatchId && m.length) setSelectedMatchId(m[0].id);
      })
      .catch(() => setError('Failed to load matches'));
  }, [setMatches, setSelectedMatchId, selectedMatchId]);

  const loadFantasy = useCallback(() => {
    if (!selectedMatchId) return;
    setLoading(true);
    fetchFantasy(selectedMatchId)
      .then(setFantasy)
      .catch(() => setError('Fantasy scores unavailable'))
      .finally(() => setLoading(false));
  }, [selectedMatchId]);

  useEffect(() => {
    loadFantasy();
  }, [loadFantasy]);

  const runSim = () => {
    if (!selectedMatchId) return;
    simulateMatch(selectedMatchId, simOver, removeWicket, newBatsman || undefined)
      .then(setSimResult)
      .catch(() => setError('Simulation failed'));
  };

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-semibold">Fan Tools</h2>
        <p className="text-sm text-white/50">What-if simulator & fantasy impact</p>
      </header>

      <select
        className="mb-6 w-full max-w-md rounded border border-white/20 bg-navy-card px-3 py-2 text-sm"
        value={selectedMatchId ?? ''}
        onChange={(e) => setSelectedMatchId(Number(e.target.value))}
      >
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            #{m.id} · {m.team1} vs {m.team2}
          </option>
        ))}
      </select>

      {error && <ErrorRetry message={error} onRetry={loadFantasy} />}

      <section className="mb-8 rounded-lg border border-white/10 bg-navy-card p-5">
        <h3 className="font-stat text-green">What If Simulator</h3>
        <p className="mt-1 text-xs text-white/50">Drag to an over, tweak wickets or batsman</p>
        <div className="mt-4">
          <label className="text-xs text-white/50">Over: {simOver}</label>
          <input
            type="range"
            min={0}
            max={19}
            value={simOver}
            onChange={(e) => setSimOver(Number(e.target.value))}
            className="mt-1 w-full accent-green"
          />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={removeWicket}
            onChange={(e) => setRemoveWicket(e.target.checked)}
          />
          Remove a wicket (counterfactual)
        </label>
        <input
          placeholder="New batsman (optional)"
          className="mt-3 w-full rounded border border-white/20 bg-navy-light px-3 py-2 text-sm"
          value={newBatsman}
          onChange={(e) => setNewBatsman(e.target.value)}
        />
        <button
          type="button"
          onClick={runSim}
          className="mt-4 rounded bg-green px-4 py-2 text-sm font-semibold text-navy"
        >
          Recalculate projection
        </button>
        {simResult && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatBadge
              label="Projected Total"
              value={simResult.projected_total}
              statKey="projected_total"
              onExplain={onExplain}
            />
            <StatBadge label="Current" value={simResult.runs} statKey="runs" onExplain={onExplain} />
            <StatBadge label="Phase" value={simResult.phase} statKey="phase" onExplain={onExplain} />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-white/10 bg-navy-card p-5">
        <h3 className="font-stat text-green">Fantasy Impact Score</h3>
        {loading ? (
          <div className="mt-4 space-y-2">
            <CardSkeleton lines={2} />
            <CardSkeleton lines={2} />
          </div>
        ) : (
          <ul className="mt-4 max-h-[480px] space-y-2 overflow-auto">
            {fantasy.map((p, i) => (
              <li
                key={p.player}
                className="flex items-center justify-between rounded border border-white/10 bg-navy-light px-4 py-3 chart-animate"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div>
                  <span className="font-stat text-amber">#{i + 1}</span>{' '}
                  <span className="ml-2 font-medium">{p.player}</span>
                  <p className="text-xs text-white/40">
                    Form {p.form} · {p.runs} runs · {p.wickets} wkts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onExplain('fantasy_score', p.fantasy_score)}
                  className="group relative font-stat text-lg text-green hover:glow-green"
                >
                  {p.fantasy_score}
                  
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-48 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="rounded bg-navy-light p-2 text-xs text-white shadow-xl border border-white/20 whitespace-normal normal-case tracking-normal font-sans">
                      Points earned based on runs, wickets, and other match contributions.
                    </div>
                    <div className="absolute right-4 bottom-[-6px] h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white/20"></div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
