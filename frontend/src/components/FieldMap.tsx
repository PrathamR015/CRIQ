import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { WagonShot } from '../api/client';

const FIELD_POSITIONS = [
  { angle: 0, r: 0.85 },
  { angle: Math.PI / 4, r: 0.9 },
  { angle: Math.PI / 2, r: 0.88 },
  { angle: (3 * Math.PI) / 4, r: 0.9 },
  { angle: Math.PI, r: 0.85 },
  { angle: (5 * Math.PI) / 4, r: 0.88 },
  { angle: (3 * Math.PI) / 2, r: 0.9 },
  { angle: (7 * Math.PI) / 4, r: 0.88 },
  { angle: Math.PI / 8, r: 0.55 },
];

interface Props {
  shots: WagonShot[];
}

export default function FieldMap({ shots }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    const size = 300;
    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.45;
    const g = svg.attr('viewBox', `0 0 ${size} ${size}`).append('g');

    g.append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', R)
      .attr('fill', '#0d2818')
      .attr('stroke', '#00FF8740');

    const shotAngles = shots.map((s) => Math.atan2(-s.y, s.x));

    FIELD_POSITIONS.forEach((fp, i) => {
      const fx = cx + Math.cos(fp.angle) * R * fp.r;
      const fy = cy + Math.sin(fp.angle) * R * fp.r;
      const covered = shotAngles.some(
        (sa) => Math.abs(sa - fp.angle) < 0.6 || Math.abs(sa - fp.angle + 2 * Math.PI) < 0.6,
      );
      g.append('circle')
        .attr('cx', fx)
        .attr('cy', fy)
        .attr('r', 10)
        .attr('fill', covered ? '#00FF8760' : '#FF475780')
        .attr('stroke', covered ? '#00FF87' : '#FF4757')
        .attr('data-i', i);
    });

    shots.slice(0, 80).forEach((s) => {
      g.append('line')
        .attr('x1', cx)
        .attr('y1', cy)
        .attr('x2', cx + s.x * R)
        .attr('y2', cy - s.y * R)
        .attr('stroke', s.runs >= 4 ? '#00FF8740' : '#ffffff20')
        .attr('stroke-width', 1);
    });

    const arcGen = d3.arc();
    for (let seg = 0; seg < 8; seg++) {
      const a0 = (seg * Math.PI) / 4 - Math.PI / 8;
      const a1 = a0 + Math.PI / 4;
      const uncovered = !shotAngles.some((sa) => sa >= a0 && sa <= a1);
      if (uncovered) {
        g.append('path')
          .attr(
            'd',
            arcGen({
              innerRadius: R * 0.5,
              outerRadius: R,
              startAngle: a0,
              endAngle: a1,
            })!,
          )
          .attr('transform', `translate(${cx},${cy})`)
          .attr('fill', '#FF475720')
          .attr('stroke', '#FF4757')
          .attr('stroke-width', 1);
      }
    }
  }, [shots]);

  return (
    <div className="chart-animate">
      <p className="mb-2 text-xs text-white/50">Red zones = uncovered arcs · Green dots = fielders</p>
      <svg ref={ref} className="mx-auto h-72 w-72" role="img" aria-label="Field gap visualizer" />
    </div>
  );
}
