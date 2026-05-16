import type { PressurePoint } from '../api/client';

function pressureColor(p: number): string {
  if (p < 0.35) return '#00FF87';
  if (p < 0.65) return '#FFB547';
  return '#FF4757';
}

export default function PressureBar({ data }: { data: PressurePoint[] }) {
  const padded = Array.from({ length: 20 }, (_, i) => {
    const found = data.find((d) => d.over === i + 1);
    return found ?? { over: i + 1, pressure: 0.1 };
  });

  return (
    <div className="chart-animate">
      <div className="mb-2 flex justify-between text-[10px] uppercase text-white/40">
        <span>Over 1</span>
        <span>Pressure Index</span>
        <span>Over 20</span>
      </div>
      <div className="flex h-10 gap-0.5 rounded overflow-hidden">
        {padded.map((d) => (
          <div
            key={d.over}
            title={`Over ${d.over}: ${(d.pressure * 100).toFixed(0)}% pressure`}
            className="flex-1 transition-all duration-300 hover:opacity-80"
            style={{
              backgroundColor: pressureColor(d.pressure),
              opacity: 0.35 + d.pressure * 0.65,
              boxShadow: d.pressure > 0.6 ? `0 0 8px ${pressureColor(d.pressure)}` : undefined,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-[10px] text-white/50">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-green" /> Low</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-amber" /> Medium</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red" /> High</span>
      </div>
    </div>
  );
}
