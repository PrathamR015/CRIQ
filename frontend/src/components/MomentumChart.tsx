import { useState, useEffect } from 'react';
import { askAI } from '../utils/ai';
import { fetchMatchAnalysis, fetchMatchSummary } from '../api/client';
import type { MatchAnalysis, MatchSummary } from '../api/client';
import { useStore } from '../store/useStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function MomentumChart() {
  const { selectedMatchId } = useStore();
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [analysis1, setAnalysis1] = useState<MatchAnalysis | null>(null);
  const [analysis2, setAnalysis2] = useState<MatchAnalysis | null>(null);
  
  const [narrative, setNarrative] = useState<string>('');
  const [narrativeLoading, setNarrativeLoading] = useState<boolean>(false);
  const [narrativeError, setNarrativeError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!selectedMatchId) return;
    setLoading(true);
    fetchMatchSummary(selectedMatchId).then(s => {
      setSummary(s);
      Promise.all([
        fetchMatchAnalysis(selectedMatchId, s.team1),
        fetchMatchAnalysis(selectedMatchId, s.team2)
      ]).then(([a1, a2]) => {
        setAnalysis1(a1);
        setAnalysis2(a2);
        setLoading(false);
      });
    });
  }, [selectedMatchId]);

  const handleNarrate = () => {
    if (!summary || !analysis1 || !analysis2) return;
    setNarrativeLoading(true);
    setNarrativeError(false);
    
    // Stringify first 5 and last 5 overs
    const getEnds = (a: MatchAnalysis) => {
      const obo = a.over_by_over || [];
      const first5 = obo.slice(0, 5).map(o => `Ov${o.over}:${o.runs}`).join(',');
      const last5 = obo.slice(-5).map(o => `Ov${o.over}:${o.runs}`).join(',');
      return `First 5 [${first5}], Last 5 [${last5}]`;
    };

    const prompt = `You are a cricket commentator. Given this over-by-over data for an IPL match between ${summary.team1} and ${summary.team2}:
${summary.team1}: ${getEnds(analysis1)}.
${summary.team2}: ${getEnds(analysis2)}.
Write exactly 3 sentences narrating the momentum shifts during the match.
Mention which team dominated early, when momentum shifted, and how it ended.
Write like you're speaking on live TV. No bullet points.`;

    askAI(prompt).then(res => {
      setNarrative(res);
      setNarrativeLoading(false);
    }).catch(() => {
      setNarrativeError(true);
      setNarrativeLoading(false);
    });
  };

  const containerStyle = {
    fontFamily: "'Inter', sans-serif",
    padding: '24px',
    animation: 'fadeIn 0.5s ease',
  };

  const cardStyle = {
    background: 'linear-gradient(145deg, #161925, #111421)',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '24px',
    border: '1px solid rgba(255,255,255,0.05)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  };

  if (loading || !summary || !analysis1 || !analysis2) {
    return (
      <div style={containerStyle}>
        <style>{`
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          .shimmer-line { height: 20px; margin-bottom: 16px; border-radius: 6px; background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.02) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite linear; }
        `}</style>
        <div className="shimmer-line" style={{ width: '100%', height: '300px' }}></div>
      </div>
    );
  }

  // Combine over data
  const chartData: any[] = [];
  let cum1 = 0;
  let cum2 = 0;
  
  for (let i = 1; i <= 20; i++) {
    const o1 = analysis1.over_by_over?.find(o => o.over === i);
    const o2 = analysis2.over_by_over?.find(o => o.over === i);
    if (o1) cum1 += o1.runs;
    if (o2) cum2 += o2.runs;
    
    if (!o1 && !o2 && i > 1) continue; // Match ended early

    chartData.push({
      over: i,
      [summary.team1]: cum1,
      [summary.team2]: cum2,
    });
  }

  const keyMoments: { over: number, label: string }[] = [];
  if (analysis1.best_over) keyMoments.push({ over: analysis1.best_over.over, label: `${summary.team1} Surge` });
  if (analysis2.best_over) keyMoments.push({ over: analysis2.best_over.over, label: `${summary.team2} Surge` });

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={cardStyle}>
        <h3 style={{ fontSize: '18px', marginBottom: '24px', color: '#00FF87', fontWeight: '600', letterSpacing: '0.5px' }}>Match Momentum</h3>
        <div style={{ height: '350px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="over" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'rgba(17,20,33,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
              />
              <Line type="monotone" dataKey={summary.team1} stroke="#E63946" strokeWidth={4} dot={{r: 0}} activeDot={{r: 6, fill: '#E63946', stroke: '#fff', strokeWidth: 2}} />
              <Line type="monotone" dataKey={summary.team2} stroke="#378ADD" strokeWidth={4} dot={{r: 0}} activeDot={{r: 6, fill: '#378ADD', stroke: '#fff', strokeWidth: 2}} />
              {keyMoments.map((m, i) => (
                <ReferenceLine key={i} x={m.over} stroke="#FFB547" strokeDasharray="4 4" opacity={0.6}>
                  <text x={m.over} y={20 + (i * 20)} fill="#FFB547" fontSize={11} fontWeight="500" textAnchor="start" dominantBaseline="hanging" dx={5}>
                    {m.label}
                  </text>
                </ReferenceLine>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
        <div>
          <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', color: '#fff8' }}>Run Rate by Phase</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {[analysis1, analysis2].map((a, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <strong style={{ display: 'block', marginBottom: '12px', color: idx === 0 ? '#E63946' : '#378ADD', fontSize: '15px' }}>{a.team}</strong>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#ccc' }}>
                  <div style={{textAlign: 'center'}}><span style={{display:'block', color:'#fff8', fontSize:'11px', marginBottom:'4px'}}>Powerplay</span> {(a.phases?.powerplay?.batting_sr / 100 * 6 || 0).toFixed(1)}</div>
                  <div style={{textAlign: 'center'}}><span style={{display:'block', color:'#fff8', fontSize:'11px', marginBottom:'4px'}}>Middle</span> {(a.phases?.middle?.batting_sr / 100 * 6 || 0).toFixed(1)}</div>
                  <div style={{textAlign: 'center'}}><span style={{display:'block', color:'#fff8', fontSize:'11px', marginBottom:'4px'}}>Death</span> {(a.phases?.death?.batting_sr / 100 * 6 || 0).toFixed(1)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', color: '#fff8' }}>
            <span style={{color: '#00FF87', marginRight: '6px'}}>✨</span> AI Match Narration
          </h3>
          
          <button 
            onClick={handleNarrate}
            style={{ background: 'linear-gradient(90deg, #378ADD, #2A6B9C)', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', marginBottom: '16px', transition: 'transform 0.1s', boxShadow: '0 4px 15px rgba(55,138,221,0.3)' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {narrative ? 'Regenerate Narration' : 'Narrate this match'}
          </button>

          {narrativeLoading && (
            <div style={{ marginTop: '8px' }}>
              <div className="shimmer-line" style={{ width: '100%', height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius:'4px', marginBottom:'8px' }}></div>
              <div className="shimmer-line" style={{ width: '90%', height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius:'4px' }}></div>
            </div>
          )}

          {narrativeError && !narrativeLoading && (
            <p style={{ color: '#ff4d4f', fontSize: '14px', background: 'rgba(255,77,79,0.1)', padding:'12px', borderRadius:'6px' }}>Unable to narrate match.</p>
          )}

          {narrative && !narrativeLoading && !narrativeError && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #00FF87', flex: 1 }}>
              <p style={{ fontStyle: 'italic', margin: 0, color: '#e0e0e0', lineHeight: '1.7', fontSize: '14px' }}>
                "{narrative}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
