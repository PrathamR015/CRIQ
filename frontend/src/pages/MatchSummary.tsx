import { useCallback, useEffect, useState } from 'react';
import { fetchMatchSummary, fetchMatchAnalysis, fetchMatches } from '../api/client';
import type { MatchSummary, MatchAnalysis } from '../api/client';
import ErrorRetry from '../components/ErrorRetry';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { useStore } from '../store/useStore';
import { askAI } from '../utils/ai';

// Animated badge for facts/metrics
function InsightBadge({ icon, label, value, color = '#00FF87' }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <span style={{ fontSize: '28px' }}>{icon}</span>
      <div>
        <p style={{ margin: 0, fontSize: '11px', color: '#fff6', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</p>
        <p style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: '600', color }}>{value}</p>
      </div>
    </div>
  );
}

// AI Narrative section
function AINarrative({ summary, analysis }: { summary: MatchSummary; analysis: MatchAnalysis }) {
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = () => {
    setLoading(true);
    const batStr = summary.innings.map(i =>
      `${i.team}: ${i.runs}/${i.wickets} in ${i.overs} overs`
    ).join(', ');
    const topBat = analysis.top_batters[0];
    const topBowl = analysis.top_bowlers[0];

    const prompt = `You are a cricket journalist writing for casual fans who may not know complex cricket terms.
Write a 3-sentence post-match report for this IPL match:
- Teams: ${summary.team1} vs ${summary.team2}
- Scores: ${batStr}
- Top batter: ${topBat ? `${topBat.name} (${topBat.runs} runs off ${topBat.balls} balls)` : 'N/A'}
- Top bowler: ${topBowl ? `${topBowl.name} (${topBowl.wickets} wickets)` : 'N/A'}
- Winner: ${summary.winner || 'No result'}
Write in simple English. No bullet points. Explain what happened and why it mattered.`;

    askAI(prompt)
      .then(res => { setNarrative(res); setGenerated(true); })
      .finally(() => setLoading(false));
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(0,255,135,0.05), rgba(55,138,221,0.05))', border: '1px solid rgba(0,255,135,0.15)', borderRadius: '12px', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#00FF87', textTransform: 'uppercase', letterSpacing: '1px' }}>
          ✨ AI Match Narrative
        </h3>
        <button
          onClick={generate}
          disabled={loading}
          style={{ background: loading ? 'rgba(0,255,135,0.2)' : '#00FF87', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', letterSpacing: '0.5px' }}
        >
          {loading ? '⏳ Generating...' : generated ? '↻ Regenerate' : '▶ Generate Story'}
        </button>
      </div>
      {loading && (
        <div>
          <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}.shimmer{height:14px;margin-bottom:10px;border-radius:4px;background:linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite linear}`}</style>
          <div className="shimmer" style={{ width: '100%' }} />
          <div className="shimmer" style={{ width: '95%' }} />
          <div className="shimmer" style={{ width: '88%' }} />
        </div>
      )}
      {!loading && narrative && (
        <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.8', color: '#e8e8e8', fontStyle: 'italic', borderLeft: '3px solid #00FF87', paddingLeft: '16px' }}>
          "{narrative}"
        </p>
      )}
      {!loading && !narrative && (
        <p style={{ margin: 0, fontSize: '14px', color: '#fff5' }}>
          Click "Generate Story" to get an AI-powered plain-English summary of this match.
        </p>
      )}
    </div>
  );
}

export default function MatchSummary() {
  const { matches, selectedMatchId, setMatches, setSelectedMatchId } = useStore();
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMatches()
      .then((m) => {
        setMatches(m);
        if (!selectedMatchId && m.length) setSelectedMatchId(m[0].id);
      })
      .catch(() => setError('Failed to load matches'));
  }, [setMatches, setSelectedMatchId, selectedMatchId]);

  const loadMatch = useCallback(() => {
    if (!selectedMatchId) return;
    setLoading(true);
    setError('');
    const matchInfo = matches.find((m) => m.id === selectedMatchId);
    if (!matchInfo) { setLoading(false); return; }
    Promise.all([
      fetchMatchSummary(selectedMatchId),
      fetchMatchAnalysis(selectedMatchId, matchInfo.team1),
    ])
      .then(([s, a]) => { setSummary(s); setAnalysis(a); })
      .catch(() => setError('Failed to load match summary'))
      .finally(() => setLoading(false));
  }, [selectedMatchId, matches]);

  useEffect(() => {
    if (matches.length > 0) loadMatch();
  }, [loadMatch, matches.length]);

  const getFanTheories = () => {
    if (!analysis || !summary) return [];
    const t: { icon: string; title: string; body: string }[] = [];

    t.push({
      icon: '🎯',
      title: 'Toss Advantage',
      body: `${analysis.toss_winner} won the toss and chose to ${analysis.toss_decision}. At ${analysis.venue}, this decision ${analysis.toss_decision === 'bat' ? 'let them set the target and control conditions' : 'gave them the advantage of knowing the exact target'}. Fans debate whether the other call would have changed the result.`
    });

    if (analysis.best_over) {
      t.push({
        icon: '🔥',
        title: 'The Turning Over',
        body: `Over ${analysis.best_over.over} was the match's explosive moment — ${analysis.best_over.runs} runs scored in a single over. This swing in momentum made it incredibly hard for the opposition to recover and set the tone for the final result.`
      });
    }

    if (analysis.top_batters.length > 0) {
      const b = analysis.top_batters[0];
      t.push({
        icon: '⚡',
        title: 'The X-Factor Player',
        body: `${b.name} scored ${b.runs} runs off just ${b.balls} balls (SR: ${b.strike_rate?.toFixed(1) ?? '—'}). If they had been dismissed early, analysts estimate the team would have fallen 25–40 runs short. One player can truly change a match.`
      });
    }

    if (analysis.phases?.death) {
      const d = analysis.phases.death;
      t.push({
        icon: '💀',
        title: 'Death Over Execution',
        body: `In the crucial last 5 overs (death phase), ${d.batting_runs ?? '—'} runs were scored. Death over batting requires nerve, power, and precision — and this phase often determines whether a total is "good" or "match-winning".`
      });
    }

    return t;
  };

  const getWinPrediction = () => {
    if (!summary || !analysis) return null;
    const initialProb = summary.win_probability[0]?.win_pct ?? 50;
    const chaseTeam = analysis.is_chase ? summary.team1 : summary.team2;
    const batFirstTeam = analysis.is_chase ? summary.team2 : summary.team1;
    const preMatchFavored = initialProb > 50 ? chaseTeam : batFirstTeam;
    const favoredPct = initialProb > 50 ? initialProb : 100 - initialProb;
    const upset = summary.winner && summary.winner !== preMatchFavored;
    return { preMatchFavored, favoredPct, actualWinner: summary.winner, upset };
  };

  const theories = getFanTheories();
  const pred = getWinPrediction();
  const selected = matches.find(m => m.id === selectedMatchId);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.fade-up{animation:fadeUp 0.4s ease forwards}`}</style>

      {/* Header */}
      <header style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Match Summary</h2>
        <p style={{ margin: 0, fontSize: '14px', color: '#fff5' }}>AI insights, fan theories & win predictions</p>
      </header>

      {/* Match Selector */}
      <div style={{ marginBottom: '24px' }}>
        <select
          style={{ background: '#161925', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', width: '100%', maxWidth: '480px', cursor: 'pointer' }}
          value={selectedMatchId ?? ''}
          onChange={(e) => setSelectedMatchId(Number(e.target.value))}
        >
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              #{m.id} · {m.team1} vs {m.team2} ({m.season})
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorRetry message={error} onRetry={loadMatch} />}

      {loading ? (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <CardSkeleton lines={4} /><CardSkeleton lines={4} />
        </div>
      ) : summary && analysis && pred ? (
        <div style={{ display: 'grid', gap: '20px' }}>

          {/* Match Result Banner */}
          {summary.winner && (
            <div className="fade-up" style={{ background: 'linear-gradient(135deg, rgba(0,255,135,0.08), rgba(0,255,135,0.02))', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '12px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#fff6', textTransform: 'uppercase', letterSpacing: '1px' }}>Match Result · {selected?.venue}</p>
                <p style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#00FF87' }}>{summary.winner} won the match</p>
              </div>
              {summary.player_of_match && summary.player_of_match !== 'nan' && (
                <div style={{ background: 'rgba(255,181,71,0.1)', border: '1px solid rgba(255,181,71,0.3)', borderRadius: '8px', padding: '10px 16px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '11px', color: '#FFB547', textTransform: 'uppercase', letterSpacing: '1px' }}>Player of the Match</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#FFB547' }}>⭐ {summary.player_of_match}</p>
                </div>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }} className="fade-up">
            <InsightBadge icon="🏏" label="Toss Winner" value={`${analysis.toss_winner} (${analysis.toss_decision})`} />
            <InsightBadge icon="📍" label="Venue" value={analysis.venue} color="#fff" />
            {analysis.top_batters[0] && <InsightBadge icon="🔥" label="Top Batter" value={`${analysis.top_batters[0].name} — ${analysis.top_batters[0].runs} runs`} color="#FFB547" />}
            {analysis.top_bowlers[0] && <InsightBadge icon="🎯" label="Top Bowler" value={`${analysis.top_bowlers[0].name} — ${analysis.top_bowlers[0].wickets} wkts`} color="#378ADD" />}
          </div>

          {/* Win Prediction + AI Narrative */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Win Prediction */}
            <div style={{ background: 'linear-gradient(145deg, #161925, #111421)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }} className="fade-up">
              <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: '600', color: '#fff8', textTransform: 'uppercase', letterSpacing: '1px' }}>📊 Win Prediction</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.2)', borderRadius: '8px', padding: '14px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#378ADD', textTransform: 'uppercase', letterSpacing: '1px' }}>Pre-Match Favourite</p>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>{pred.preMatchFavored}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#fff6' }}>{pred.favoredPct.toFixed(1)}% win probability going in</p>
                </div>
                <div style={{ background: pred.upset ? 'rgba(255,77,79,0.08)' : 'rgba(0,255,135,0.08)', border: `1px solid ${pred.upset ? 'rgba(255,77,79,0.25)' : 'rgba(0,255,135,0.25)'}`, borderRadius: '8px', padding: '14px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: pred.upset ? '#ff4d4f' : '#00FF87', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {pred.upset ? '🤯 Upset!' : '✅ Prediction Correct'}
                  </p>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>{pred.actualWinner ?? 'No result'}</p>
                  {pred.upset && <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#fff6' }}>The underdog defied the odds!</p>}
                </div>
              </div>
            </div>

            {/* AI Narrative */}
            <div className="fade-up">
              <AINarrative summary={summary} analysis={analysis} />
            </div>
          </div>

          {/* Fan Theories */}
          <div style={{ background: 'linear-gradient(145deg, #161925, #111421)', border: '1px solid rgba(255,181,71,0.15)', borderRadius: '12px', padding: '24px' }} className="fade-up">
            <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: '600', color: '#FFB547', textTransform: 'uppercase', letterSpacing: '1px' }}>🧠 Fan Theories & What-Ifs</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              {theories.map((theory, idx) => (
                <div key={idx} style={{ background: 'rgba(255,181,71,0.04)', border: '1px solid rgba(255,181,71,0.12)', borderRadius: '10px', padding: '18px', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,181,71,0.35)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,181,71,0.12)')}
                >
                  <p style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: '600', color: '#FFB547' }}>
                    {theory.icon} {theory.title}
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.7', color: '#ccc' }}>{theory.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Stats: Phases Breakdown */}
          {analysis.phases && (
            <div style={{ background: 'linear-gradient(145deg, #161925, #111421)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }} className="fade-up">
              <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: '600', color: '#fff8', textTransform: 'uppercase', letterSpacing: '1px' }}>📈 Phase Breakdown — {analysis.team}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {(['powerplay', 'middle', 'death'] as const).map((phase) => {
                  const p = analysis.phases[phase];
                  if (!p) return null;
                  const labels: Record<string, string> = { powerplay: '⚡ Powerplay (1–6)', middle: '🔄 Middle (7–15)', death: '💀 Death (16–20)' };
                  return (
                    <div key={phase} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#fff6' }}>{labels[phase]}</p>
                      <p style={{ margin: '0', fontSize: '22px', fontWeight: '700', color: '#00FF87' }}>{p.batting_runs ?? '—'}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#fff5' }}>runs · {p.wickets ?? 0} wkts</p>
                    </div>
                  );
                })}
              </div>
              <p style={{ marginTop: '16px', marginBottom: 0, fontSize: '12px', color: '#fff4', lineHeight: '1.6' }}>
                💡 <strong style={{ color: '#fff7' }}>Simple explanation:</strong> Powerplay is the first 6 overs when only 2 fielders are allowed outside. Middle overs are the tactical battle. Death overs (last 5) are where matches are won or lost with big hitting.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
