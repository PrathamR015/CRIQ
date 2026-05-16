import { useState, useEffect } from 'react';
import { askAI } from '../utils/ai';

interface StatExplainerProps {
  isOpen: boolean;
  onClose: () => void;
  statName: string;
  statValue: number | string;
  playerName: string;
  role: string;
}

export default function StatExplainer({ isOpen, onClose, statName, statValue, playerName, role }: StatExplainerProps) {
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !statName) return;

    let isMounted = true;
    setLoading(true);
    setError(false);
    setExplanation('');

    const prompt = `You are a cricket stats explainer for casual fans who are new to the sport.
Explain what a ${statName} of ${statValue} means for ${playerName} (${role}).
Keep it to exactly 2 sentences. First sentence: what the number means in plain English.
Second sentence: whether it's good, average, or poor compared to typical IPL standards.
Do not use jargon. Do not start with "I".`;

    askAI(prompt)
      .then(res => {
        if (isMounted) {
          setExplanation(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [isOpen, statName, statValue, playerName, role]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 9998,
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '380px',
          height: '100vh',
          background: 'linear-gradient(145deg, #111421, #0a0b12)',
          color: '#fff',
          zIndex: 9999,
          boxShadow: '-10px 0 30px rgba(0,0,0,0.8)',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', sans-serif",
          animation: 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          borderLeft: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .shimmer-line {
            height: 14px;
            margin-bottom: 12px;
            border-radius: 6px;
            background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite linear;
          }
        `}</style>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#00FF87', letterSpacing: '0.5px' }}>
            {playerName} <span style={{color: '#fff5'}}>·</span> {statName}
          </h2>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#fff5', fontSize: '28px', cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseOver={e => (e.currentTarget.style.color = '#fff')}
            onMouseOut={e => (e.currentTarget.style.color = '#fff5')}
          >
            &times;
          </button>
        </div>

        <div style={{ marginBottom: '40px', padding: '24px 0', background: 'radial-gradient(circle at center, rgba(0,255,135,0.05) 0%, transparent 70%)' }}>
          <div style={{ fontSize: '64px', fontWeight: '800', color: '#fff', textAlign: 'center', textShadow: '0 0 20px rgba(0,255,135,0.2)' }}>
            {statValue}
          </div>
        </div>

        <div style={{ 
          background: 'rgba(255,255,255,0.02)', 
          padding: '24px', 
          borderRadius: '12px', 
          flex: 1,
          border: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', marginTop: 0, color: '#fff8' }}>
            <span style={{color: '#00FF87', marginRight: '6px'}}>✨</span> AI Insight
          </h3>
          
          {loading && (
            <div style={{ marginTop: '16px' }}>
              <div className="shimmer-line" style={{ width: '100%' }}></div>
              <div className="shimmer-line" style={{ width: '92%' }}></div>
              <div className="shimmer-line" style={{ width: '85%' }}></div>
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <p style={{ color: '#ff4d4f', fontSize: '14px', marginBottom: '16px' }}>Connection error retrieving insight.</p>
              <button 
                onClick={() => {
                  setLoading(true);
                  setError(false);
                  askAI(`You are a cricket stats explainer for casual fans who are new to the sport.\nExplain what a ${statName} of ${statValue} means for ${playerName} (${role}).\nKeep it to exactly 2 sentences. First sentence: what the number means in plain English.\nSecond sentence: whether it's good, average, or poor compared to typical IPL standards.\nDo not use jargon. Do not start with "I".`)
                    .then(res => { setExplanation(res); setLoading(false); })
                    .catch(() => { setError(true); setLoading(false); });
                }}
                style={{ background: '#00FF87', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Retry Generation
              </button>
            </div>
          )}

          {!loading && !error && explanation && (
            <div style={{ fontSize: '15px', lineHeight: '1.7', color: '#e0e0e0', fontWeight: '400' }}>
              {explanation}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
