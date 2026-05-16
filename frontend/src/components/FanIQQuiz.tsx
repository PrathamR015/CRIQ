import { useState, useEffect } from 'react';
import { askAI } from '../utils/ai';
import { fetchMatchSummary } from '../api/client';
import { useStore } from '../store/useStore';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

const RANK_LABELS: Record<number, { title: string; emoji: string; color: string }> = {
  4: { title: 'Cricket Genius!', emoji: '🏆', color: '#FFB547' },
  3: { title: 'Match Expert', emoji: '🎯', color: '#00FF87' },
  2: { title: 'Casual Fan', emoji: '👀', color: '#378ADD' },
  1: { title: 'Just Starting Out', emoji: '🏏', color: '#ff7f50' },
  0: { title: 'Keep Watching!', emoji: '📺', color: '#ff4d4f' },
};

export default function FanIQQuiz() {
  const { selectedMatchId, matches } = useStore();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);

  const fetchQuestions = () => {
    if (!selectedMatchId) { setLoading(false); setError(true); return; }
    setLoading(true);
    setError(false);

    fetchMatchSummary(selectedMatchId).then(summary => {
      const batStr = summary.innings.map(i =>
        `${i.team}: ${i.runs}/${i.wickets} in ${i.overs} overs. ` +
        (i.batting?.slice(0, 3).map(b => `${b.batter} ${b.runs}(${b.balls})`).join(', ') || '')
      ).join(' | ');

      const bowlStr = summary.innings.map(i =>
        `${i.team} bowling: ` + (i.bowling?.slice(0, 2).map(b => `${b.bowler} ${b.wickets}/${b.runs}`).join(', ') || '')
      ).join(' | ');

      const prompt = `You are a cricket quiz host. Generate exactly 4 multiple choice questions about this IPL match between ${summary.team1} and ${summary.team2}. Make questions that test understanding of the match, not just trivia — e.g. ask WHY a player's stats matter, or what a number means.

Match data: ${batStr}
Bowling: ${bowlStr}
Winner: ${summary.winner || 'No result'}
Player of match: ${summary.player_of_match || 'N/A'}

Return ONLY a valid JSON array, no extra text:
[{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":"A. ...","explanation":"Plain English one-sentence reason."}]`;

      askAI(prompt).then(res => {
        try {
          const match = res.match(/\[\s*\{[\s\S]*\}\s*\]/);
          const jsonStr = match ? match[0] : res;
          const data = JSON.parse(jsonStr) as QuizQuestion[];
          if (Array.isArray(data) && data.length > 0) {
            setQuestions(data);
            setCurrentIndex(0); setScore(0);
            setSelectedOption(null); setQuizFinished(false);
          } else throw new Error('Bad format');
        } catch (e) {
          console.error('Quiz parse error:', e, res);
          setError(true);
        }
        setLoading(false);
      }).catch(() => { setError(true); setLoading(false); });
    }).catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchQuestions(); }, [selectedMatchId]);

  const handleOptionClick = (opt: string) => {
    if (selectedOption !== null) return;
    setSelectedOption(opt);
    if (opt === questions[currentIndex].answer) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedOption(null);
    } else {
      setQuizFinished(true);
    }
  };

  const selected = matches.find(m => m.id === selectedMatchId);

  // Loading state
  if (loading) return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: '24px', maxWidth: '640px', margin: '0 auto' }}>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}.sh{height:16px;margin-bottom:14px;border-radius:6px;background:linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite linear}`}</style>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <p style={{ fontSize: '28px', margin: '0 0 8px' }}>🧠</p>
        <p style={{ color: '#fff6', fontSize: '14px' }}>Generating match-specific questions with AI...</p>
      </div>
      {[100, 90, 95, 80].map((w, i) => <div key={i} className="sh" style={{ width: `${w}%` }} />)}
    </div>
  );

  // Error state
  if (error) return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: '24px', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ fontSize: '36px', marginBottom: '12px' }}>😅</p>
      <p style={{ color: '#ff4d4f', marginBottom: '16px' }}>Couldn't load quiz questions.</p>
      <button onClick={fetchQuestions} style={{ background: '#00FF87', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>Try Again</button>
    </div>
  );

  // Results screen
  if (quizFinished) {
    const rank = RANK_LABELS[score] ?? RANK_LABELS[0];
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", padding: '24px', maxWidth: '640px', margin: '0 auto' }}>
        <style>{`@keyframes pop{0%{transform:scale(0.5);opacity:0}80%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}.pop{animation:pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards}`}</style>
        <div style={{ background: 'linear-gradient(145deg, #161925, #111421)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
          <div className="pop" style={{ fontSize: '64px', marginBottom: '16px' }}>{rank.emoji}</div>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: rank.color, margin: '0 0 8px' }}>{rank.title}</h2>
          <p style={{ fontSize: '16px', color: '#fff7', margin: '0 0 32px' }}>
            You scored <strong style={{ color: '#fff', fontSize: '20px' }}>{score}</strong> out of <strong style={{ color: '#fff', fontSize: '20px' }}>{questions.length}</strong>
          </p>

          {/* Score bar */}
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '100px', height: '10px', marginBottom: '32px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(score / questions.length) * 100}%`, background: `linear-gradient(90deg, ${rank.color}, ${rank.color}80)`, borderRadius: '100px', transition: 'width 0.8s ease' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={fetchQuestions} style={{ background: '#00FF87', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
              🔄 Retake Quiz
            </button>
          </div>

          <p style={{ marginTop: '24px', fontSize: '13px', color: '#fff4' }}>
            Match: {selected?.team1} vs {selected?.team2} ({selected?.season})
          </p>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: '24px', maxWidth: '640px', margin: '0 auto', color: '#fff' }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.qfade{animation:fadeIn 0.3s ease forwards}`}</style>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px' }}>🧠 Fan IQ Quiz</h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#fff5' }}>
          {selected?.team1} vs {selected?.team2} · {selected?.season}
        </p>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#fff6', marginBottom: '8px' }}>
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span style={{ color: '#00FF87', fontWeight: '600' }}>Score: {score}</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '100px', height: '6px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #00FF87, #378ADD)', borderRadius: '100px', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Question Card */}
      <div className="qfade" key={currentIndex} style={{ background: 'linear-gradient(145deg, #161925, #111421)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '28px' }}>
        <h3 style={{ fontSize: '18px', lineHeight: '1.5', margin: '0 0 24px', fontWeight: '600' }}>{q.question}</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {q.options.map((opt, idx) => {
            let bg = 'rgba(255,255,255,0.04)';
            let border = '1px solid rgba(255,255,255,0.08)';
            let textColor = '#e0e0e0';
            let icon = '';

            if (selectedOption !== null) {
              if (opt === q.answer) {
                bg = 'rgba(0,255,135,0.1)';
                border = '1px solid #00FF87';
                textColor = '#00FF87';
                icon = '✓ ';
              } else if (opt === selectedOption && opt !== q.answer) {
                bg = 'rgba(255,77,79,0.1)';
                border = '1px solid #ff4d4f';
                textColor = '#ff4d4f';
                icon = '✗ ';
              }
            }

            return (
              <button key={idx} onClick={() => handleOptionClick(opt)} style={{
                padding: '14px 18px', background: bg, border, color: textColor,
                textAlign: 'left', borderRadius: '10px', fontSize: '15px',
                cursor: selectedOption === null ? 'pointer' : 'default',
                transition: 'all 0.2s', fontFamily: 'inherit', fontWeight: selectedOption && opt === q.answer ? '600' : '400'
              }}
                onMouseEnter={e => { if (selectedOption === null) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { if (selectedOption === null) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              >
                {icon}{opt}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {selectedOption && (
          <div style={{ marginTop: '20px', background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.25)', borderRadius: '10px', padding: '16px' }}>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#c8d8f0' }}>
              <span style={{ color: '#378ADD', fontWeight: '700' }}>💡 Explained simply: </span>{q.explanation}
            </p>
          </div>
        )}

        {/* Next button */}
        {selectedOption && (
          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button onClick={handleNext} style={{ background: 'linear-gradient(90deg, #00FF87, #00cc6a)', color: '#000', border: 'none', padding: '12px 28px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'transform 0.1s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {currentIndex < questions.length - 1 ? 'Next Question →' : '🏆 See Results'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
