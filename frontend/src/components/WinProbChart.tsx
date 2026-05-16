import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useMemo } from 'react';

interface Point {
  over: number;
  win_pct: number;
}

interface Props {
  data: Point[];
  chasingTeam: string;
  battingTeam: string;
}

export default function WinProbChart({ data, chasingTeam, battingTeam }: Props) {
  // Transform data to explicitly have both teams' probabilities
  const chartData = useMemo(() => {
    return data.map((d) => ({
      over: d.over,
      [chasingTeam]: d.win_pct,
      [battingTeam]: 100 - d.win_pct,
    }));
  }, [data, chasingTeam, battingTeam]);

  return (
    <div className="chart-animate h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="chaseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00FF87" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#00FF87" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="batGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFB547" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#FFB547" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="over" stroke="#ffffff40" tick={{ fill: '#fff8', fontSize: 11 }} label={{ value: 'Over', position: 'insideBottom', fill: '#fff6' }} />
          <YAxis domain={[0, 100]} stroke="#ffffff40" tick={{ fill: '#fff8', fontSize: 11 }} unit="%" />
          <Tooltip
            contentStyle={{ background: '#161d32', border: '1px solid #ffffff20', borderRadius: 8 }}
            labelStyle={{ color: '#fff' }}
          />
          <Area type="monotone" dataKey={chasingTeam} stackId="1" stroke="#00FF87" fill="url(#chaseGrad)" strokeWidth={2} animationDuration={300} />
          <Area type="monotone" dataKey={battingTeam} stackId="1" stroke="#FFB547" fill="url(#batGrad)" strokeWidth={2} animationDuration={300} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
