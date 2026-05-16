import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { WagonShot } from '../api/client';

const ZONE_COLORS: Record<string, string> = {
  boundary: '#00FF87',
  single: '#ffffff',
  dot: '#FF4757',
};

interface Props {
  shots: WagonShot[];
}

export default function WagonWheel({ shots }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    const size = 320;
    const cx = size / 2;
    const cy = size / 2;
    const g = svg.attr('viewBox', `0 0 ${size} ${size}`).append('g');

    g.append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', size * 0.48)
      .attr('fill', '#121829')
      .attr('stroke', '#00FF8730');

    [0.25, 0.5, 0.75, 1].forEach((r) => {
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', size * 0.48 * r)
        .attr('fill', 'none')
        .attr('stroke', '#ffffff10');
    });

    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.append('line')
        .attr('x1', cx)
        .attr('y1', cy)
        .attr('x2', cx + Math.cos(a) * size * 0.48)
        .attr('y2', cy + Math.sin(a) * size * 0.48)
        .attr('stroke', '#ffffff08');
    }

    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 4).attr('fill', '#FFB547');

    const scale = size * 0.45;
    shots.forEach((s, i) => {
      const x2 = cx + s.x * scale;
      const y2 = cy - s.y * scale;
      g.append('line')
        .attr('x1', cx)
        .attr('y1', cy)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', ZONE_COLORS[s.zone] || '#fff')
        .attr('stroke-width', s.zone === 'boundary' ? 2 : 1)
        .attr('opacity', 0.7)
        .attr('stroke-linecap', 'round')
        .style('animation', `chartIn 300ms ease-out ${Math.min(i * 2, 200)}ms both`);
    });
  }, [shots]);

  return (
    <div className="chart-animate flex justify-center">
      <svg ref={ref} className="h-80 w-80 max-w-full" role="img" aria-label="Wagon wheel" />
    </div>
  );
}
