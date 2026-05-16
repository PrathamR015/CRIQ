import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMatchSummary, fetchMatches, fetchPressure } from '../api/client';
import type { MatchSummary, PressurePoint } from '../api/client';
import ErrorRetry from '../components/ErrorRetry';
import PressureBar from '../components/PressureBar';
import StatBadge from '../components/StatBadge';
import WinProbChart from '../components/WinProbChart';
import { CardSkeleton, ChartSkeleton } from '../components/LoadingSkeleton';
import { useStore } from '../store/useStore';
import { askAI } from '../utils/ai';

function MatchStoryGenerator({ summary }: { summary: MatchSummary }) {
  const [story, setStory] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  const generate = () => {
    setLoading(true);
    setError(false);
    
    let tops = '';
    if (summary.innings) {
      tops = summary.innings.map(i => {
        const topBat = i.batting ? i.batting.slice(0, 1).map(b => `${b.batter}`).join(', ') : '';
        const topBowl = i.bowling ? i.bowling.slice(0, 1).map(b => `${b.bowler}`).join(', ') : '';
        return `${topBat}, ${topBowl}`;
      }).join(', ');
    }

    const prompt = `You are a cricket journalist. Summarize this IPL match in exactly 3 sentences
like a post-match report: ${summary.team1} played ${summary.team2}.
Key performers: ${tops}.
Result: ${summary.winner || 'No result'}. Focus on the turning point and match narrative.
Do not use bullet points.`;

    askAI(prompt)
      .then(res => {
        setStory(res);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  if (story) return <p style={{ fontStyle: 'italic', margin: 0 }}>{story}</p>;
  
  if (loading) return (
    <div>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .shimmer-line { height: 14px; margin-bottom: 8px; border-radius: 4px; background: linear-gradient(90deg, #1A1D27 25%, #2a2e3d 50%, #1A1D27 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite linear; }
      `}</style>
      <div className="shimmer-line" style={{ width: '100%' }}></div>
      <div className="shimmer-line" style={{ width: '90%' }}></div>
      <div className="shimmer-line" style={{ width: '80%' }}></div>
    </div>
  );
  
  if (error) return (
    <div>
      <p style={{ color: '#ff4d4f', marginBottom: '8px' }}>Failed to generate match story.</p>
      <button onClick={generate} style={{ background: '#378ADD', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Try Again</button>
    </div>
  );

  return (
    <button onClick={generate} style={{ background: '#378ADD', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
      Generate AI Match Story
    </button>
  );
}

interface Props {
  onExplain: (stat: string, value: number) => void;
}

export default function Home({ onExplain }: Props) {
  const { matches, selectedMatchId, setMatches, setSelectedMatchId, showToast } = useStore();
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [pressure, setPressure] = useState<PressurePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [seasonFilter, setSeasonFilter] = useState<number | 'all'>('all');
  const [teamFilter, setTeamFilter] = useState('');

  useEffect(() => {
    fetchMatches()
      .then((m) => {
        setMatches(m);
        if (!selectedMatchId && m.length) setSelectedMatchId(m[0].id);
      })
      .catch(() => setError('Failed to load matches'));
  }, [setMatches, setSelectedMatchId, selectedMatchId]);

  const seasons = useMemo(
    () => [...new Set(matches.map((m) => m.season))].sort((a, b) => b - a),
    [matches],
  );

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (seasonFilter !== 'all' && m.season !== seasonFilter) return false;
      if (teamFilter && !m.team1.includes(teamFilter) && !m.team2.includes(teamFilter))
        return false;
      return true;
    });
  }, [matches, seasonFilter, teamFilter]);

  const loadMatch = useCallback(() => {
    if (!selectedMatchId) return;
    setLoading(true);
    setError('');
    
    fetchMatchSummary(selectedMatchId)
      .then((s) => {
        setSummary(s);
        
        // Compute chasing team to fetch correct pressure index
        const battingFirst = s.innings.find(i => i.innings === 1)?.team || s.team1;
        const chasing = s.innings.find(i => i.innings === 2)?.team || (battingFirst === s.team1 ? s.team2 : s.team1);
        
        return fetchPressure(selectedMatchId, chasing).then(p => {
          setPressure(p);
          showToast('Match data refreshed');
        });
      })
      .catch(() => setError('Failed to load match analytics'))
      .finally(() => setLoading(false));
  }, [selectedMatchId, showToast]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  const selected = matches.find((m) => m.id === selectedMatchId);

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-semibold">Match Dashboard</h2>
        <p className="text-sm text-white/50">Live-style insights from ball-by-ball data</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          className="rounded border border-white/20 bg-navy-card px-3 py-2 text-sm"
          value={seasonFilter}
          onChange={(e) =>
            setSeasonFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
        >
          <option value="all">All seasons</option>
          {seasons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter team..."
          className="rounded border border-white/20 bg-navy-card px-3 py-2 text-sm"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
        />
        <select
          className="min-w-[200px] flex-1 rounded border border-white/20 bg-navy-card px-3 py-2 text-sm"
          value={selectedMatchId ?? ''}
          onChange={(e) => setSelectedMatchId(Number(e.target.value))}
        >
          {filtered.map((m) => (
            <option key={m.id} value={m.id}>
              #{m.id} · {m.team1} vs {m.team2} ({m.season})
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorRetry message={error} onRetry={loadMatch} />}

      {loading && !summary ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CardSkeleton lines={4} />
          <ChartSkeleton />
        </div>
      ) : summary ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {(() => {
            const battingFirst = summary.innings.find(i => i.innings === 1)?.team || summary.team1;
            const chasingTeam = summary.innings.find(i => i.innings === 2)?.team || (battingFirst === summary.team1 ? summary.team2 : summary.team1);
            const inn1 = summary.innings.find(i => i.innings === 1);
            
            return (
              <>
                {/* Enhanced Scoreboard */}
                <div className="rounded-lg border border-white/10 bg-navy-card p-5 glow-green relative overflow-hidden lg:col-span-2">
                  <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight">
                        <span className="text-white">{summary.team1}</span>
                        <span className="text-white/40 mx-2">vs</span>
                        <span className="text-white">{summary.team2}</span>
                      </h3>
                      <p className="text-xs text-white/50 mt-1 uppercase tracking-wider">{selected?.venue}</p>
                    </div>
                    <div className="text-right">
                      <span className="rounded bg-green/20 px-2 py-1 text-xs font-semibold text-green uppercase tracking-wide">
                        Match Score
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Batting First */}
                    {inn1 && (
                      <div className="flex justify-between items-end opacity-70">
                        <div>
                          <p className="text-sm font-semibold text-white/80">{inn1.team}</p>
                          <p className="text-xs text-white/40">1st Innings</p>
                        </div>
                        <div className="text-right font-stat text-2xl text-white/80">
                          {inn1.runs}/{inn1.wickets}
                          <span className="text-sm ml-2 text-white/40">({inn1.overs} ov)</span>
                        </div>
                      </div>
                    )}

                    {/* Chasing */}
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-lg font-bold text-white">{chasingTeam}</p>
                        <p className="text-xs text-green">Target: {summary.scorecard.target}</p>
                      </div>
                      <div className="text-right font-stat text-5xl text-green">
                        {summary.scorecard.current_score}/{summary.scorecard.wickets}
                        <span className="text-lg ml-2 text-white/60">({summary.scorecard.overs_completed} ov)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 pt-4 border-t border-white/10">
                    <StatBadge label="RRR" value={summary.scorecard.rrr} statKey="rrr" onExplain={onExplain} />
                    <StatBadge
                      label="Run Rate"
                      value={summary.scorecard.run_rate}
                      statKey="run_rate"
                      onExplain={onExplain}
                    />
                    <StatBadge
                      label="Projected"
                      value={summary.scorecard.projected_total}
                      statKey="projected_total"
                      onExplain={onExplain}
                    />
                    <StatBadge
                      label="Overs"
                      value={summary.scorecard.overs_completed}
                      statKey="overs"
                      onExplain={onExplain}
                    />
                  </div>
                </div>
                 {/* Player of the Match & Match Result Banner */}
                {summary.winner && (
                  <div className="rounded-lg border border-green/30 bg-green/10 p-4 text-center glow-green lg:col-span-2">
                    <span className="font-stat text-xl text-green block uppercase tracking-widest">{summary.winner} won the match</span>
                    {summary.player_of_match && summary.player_of_match !== 'nan' && (
                      <span className="mt-2 text-sm text-white/80 block">
                        Player of the Match: <strong className="text-amber">{summary.player_of_match}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* Enhanced Win Prob Chart */}
                <div className="rounded-lg border border-white/10 bg-navy-card p-5">
                  <h3 className="mb-2 font-stat text-sm text-green">Win Probability</h3>
                  <div className="mb-2 flex items-center justify-between text-xs text-white/50">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#00FF87]"></div> {chasingTeam} (Chasing)</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#FFB547]"></div> {battingFirst} (Defending)</span>
                  </div>
                  <WinProbChart 
                    data={summary.win_probability} 
                    chasingTeam={chasingTeam} 
                    battingTeam={battingFirst} 
                  />
                </div>
                
                {/* Simplified Match Story */}
                <div className="rounded-lg border border-white/10 bg-navy-card p-5">
                  <h3 className="mb-3 font-stat text-sm text-green">Match Story</h3>
                  <div className="rounded border border-white/5 bg-navy-light p-4 text-sm leading-relaxed text-white/80 min-h-[224px] flex flex-col justify-center">
                    <MatchStoryGenerator summary={summary} />
                  </div>
                </div>

                {/* Full Detailed Scorecard */}
                <div className="rounded-lg border border-white/10 bg-navy-card p-5 lg:col-span-2">
                  <h3 className="mb-4 font-stat text-lg text-green uppercase tracking-wide">Detailed Scorecard</h3>
                  
                  {summary.innings.map((inn) => (
                    <div key={inn.innings} className="mb-8 last:mb-0">
                      <div className="flex items-center justify-between bg-navy-light px-4 py-2 border-l-4 border-green rounded-r">
                        <span className="font-semibold text-white">{inn.team} ({inn.innings === 1 ? '1st Inn' : '2nd Inn'})</span>
                        <span className="font-stat text-xl text-white">{inn.runs}-{inn.wickets} <span className="text-sm text-white/50">({inn.overs} Ov)</span></span>
                      </div>
                      
                      {inn.batting && inn.batting.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm mt-2">
                            <thead className="border-b border-white/10 text-white/50 bg-white/[0.02]">
                              <tr>
                                <th className="py-2 px-3 font-medium">Batter</th>
                                <th className="py-2 px-3 font-medium text-center"></th>
                                <th className="py-2 px-3 font-medium text-right">R</th>
                                <th className="py-2 px-3 font-medium text-right">B</th>
                                <th className="py-2 px-3 font-medium text-right">4s</th>
                                <th className="py-2 px-3 font-medium text-right">6s</th>
                                <th className="py-2 px-3 font-medium text-right">SR</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inn.batting.map((b, idx) => (
                                <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                                  <td className="py-2 px-3 font-medium text-white">{b.batter}</td>
                                  <td className="py-2 px-3 text-white/40 text-xs italic">{b.dismissed ? 'out' : 'not out'}</td>
                                  <td className="py-2 px-3 text-right font-semibold">{b.runs}</td>
                                  <td className="py-2 px-3 text-right text-white/70">{b.balls}</td>
                                  <td className="py-2 px-3 text-right text-white/70">{b.fours}</td>
                                  <td className="py-2 px-3 text-right text-white/70">{b.sixes}</td>
                                  <td className="py-2 px-3 text-right text-white/70">{b.strike_rate.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {inn.bowling && inn.bowling.length > 0 && (
                        <div className="overflow-x-auto mt-4">
                          <table className="w-full text-left text-sm">
                            <thead className="border-b border-white/10 text-white/50 bg-white/[0.02]">
                              <tr>
                                <th className="py-2 px-3 font-medium">Bowler</th>
                                <th className="py-2 px-3 font-medium text-right">O</th>
                                <th className="py-2 px-3 font-medium text-right">R</th>
                                <th className="py-2 px-3 font-medium text-right">W</th>
                                <th className="py-2 px-3 font-medium text-right">ECON</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inn.bowling.sort((a,b) => b.wickets - a.wickets).map((b, idx) => (
                                <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                                  <td className="py-2 px-3 font-medium text-white">{b.bowler}</td>
                                  <td className="py-2 px-3 text-right text-white/70">{b.overs}</td>
                                  <td className="py-2 px-3 text-right text-white/70">{b.runs}</td>
                                  <td className="py-2 px-3 text-right font-semibold text-white">{b.wickets}</td>
                                  <td className="py-2 px-3 text-right text-white/70">{b.economy.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-white/10 bg-navy-card p-5 lg:col-span-2">
                  <h3 className="mb-3 font-stat text-sm text-green flex justify-between items-center">
                    <span>Pressure Index Heatmap</span>
                    <span className="text-xs text-white/50 font-sans normal-case tracking-normal">Tracking pressure applied on {chasingTeam} (Chasing Team)</span>
                  </h3>
                  <PressureBar data={pressure} />
                </div>
              </>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
