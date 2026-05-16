import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { MatchupResult } from '../api/client';
import StatBadge from './StatBadge';

interface Props {
  data: MatchupResult;
  onExplain: (stat: string, value: number) => void;
}

export default function MatchupCard({ data, onExplain }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !data.pitch_zones.length) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    const w = 200;
    const h = 280;
    const g = svg.attr('viewBox', `0 0 ${w} ${h}`).append('g');

    g.append('rect')
      .attr('width', w)
      .attr('height', h)
      .attr('rx', 4)
      .attr('fill', '#1a3d1a')
      .attr('stroke', '#00FF8740');

    data.pitch_zones.forEach((z) => {
      const cx = w / 2 + z.x * (w * 0.4);
      const cy = h * 0.3 - z.y * (h * 0.25);
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', z.kind === 'shot' ? 4 : 8)
        .attr('fill', z.kind === 'shot' ? '#00FF8780' : '#FF4757')
        .attr('stroke', '#fff');
    });
  }, [data]);

  return (
    <div className="rounded-lg border border-white/10 bg-navy-card p-4">
      <h3 className="font-stat text-green">
        {data.batsman} vs {data.bowler}
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatBadge label="Dismissals" value={data.dismissals} statKey="dismissals" onExplain={onExplain} />
        <StatBadge label="Average" value={data.average} statKey="average" onExplain={onExplain} />
        <StatBadge label="Strike Rate" value={data.strike_rate} statKey="strike_rate" onExplain={onExplain} />
        <StatBadge label="Balls" value={data.balls} statKey="balls" onExplain={onExplain} />
      </div>
      <p className="mt-3 text-xs text-white/50">Pitch zone heatmap (wickets in red)</p>
      <svg ref={ref} className="mx-auto mt-2 h-48 w-40" />
    </div>
  );
}
