export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-navy-card p-4">
      <div className="skeleton mb-3 h-4 w-1/3 rounded" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton mb-2 h-8 rounded" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return <div className="skeleton h-64 w-full rounded-lg" />;
}
