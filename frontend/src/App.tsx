import { Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Layout from './components/Layout';
import StatExplainer from './components/StatExplainer';
import Home from './pages/Home';
import MatchAnalysis from './pages/MatchAnalysis';
import MatchSummary from './pages/MatchSummary';
import Player from './pages/Player';
import Team from './pages/Team';
import FanTools from './pages/FanTools';
import MomentumChart from './components/MomentumChart';
import FanIQQuiz from './components/FanIQQuiz';

export default function App() {
  const [explainerState, setExplainerState] = useState<{ isOpen: boolean; statName: string; statValue: number | string; playerName: string; role: string }>({
    isOpen: false,
    statName: '',
    statValue: 0,
    playerName: 'Player',
    role: 'Batter',
  });

  const onExplain = (stat: string, value: number) => {
    // Basic mapping, assuming standard player for now since the original didn't pass playerName
    setExplainerState({
      isOpen: true,
      statName: stat,
      statValue: value,
      playerName: 'Player',
      role: 'Cricketer',
    });
  };

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home onExplain={onExplain} />} />
          <Route path="summary" element={<MatchSummary />} />
          <Route path="match" element={<MatchAnalysis />} />
          <Route path="momentum" element={<MomentumChart />} />
          <Route path="player" element={<Player onExplain={onExplain} />} />
          <Route path="team" element={<Team />} />
          <Route path="fan" element={<FanTools onExplain={onExplain} />} />
          <Route path="faniq" element={<FanIQQuiz />} />
        </Route>
      </Routes>
      <StatExplainer
        isOpen={explainerState.isOpen}
        onClose={() => setExplainerState(s => ({ ...s, isOpen: false }))}
        statName={explainerState.statName}
        statValue={explainerState.statValue}
        playerName={explainerState.playerName}
        role={explainerState.role}
      />
    </>
  );
}
