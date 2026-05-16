export const statExplanations: Record<string, string> = {
  strike_rate: "How many runs a batsman is expected to score if they face 100 balls.",
  economy: "Average number of runs a bowler concedes per over (6 balls).",
  boundary_pct: "Percentage of balls hit for a boundary (4 or 6 runs).",
  dot_ball_pct: "Percentage of balls from which no runs are scored.",
  rrr: "Required Run Rate - Runs needed per over to win the match.",
  pressure: "A measure of how much difficulty a team is facing, based on dot balls, wickets, and boundary droughts.",
  form_score: "A rating of the player's recent performance compared to their average.",
  fantasy_score: "Points earned based on runs, wickets, and other match contributions.",
  average: "Average runs scored by a batsman before getting out.",
  matches: "Total number of matches played.",
  runs: "Total runs scored.",
  wickets: "Total wickets taken.",
  balls: "Total legal deliveries bowled/faced.",
  dismissals: "Number of times a batsman has been given out.",
  projected_total: "Estimated final score based on the current run rate.",
  phase: "Match phase: powerplay (0-6 overs), middle (6-15 overs), or death (15-20 overs).",
  run_rate: "Average runs scored per over.",
  overs: "Total overs bowled/faced (1 over = 6 balls).",
  boundaries: "Total number of boundaries (4s and 6s) hit.",
  dot_balls: "Total balls faced/bowled where no runs were scored."
};

interface StatBadgeProps {
  label: string;
  value: string | number;
  statKey: string;
  onExplain?: (statKey: string, value: number) => void;
}

export default function StatBadge({ label, value, statKey, onExplain }: StatBadgeProps) {
  const num = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
  const explanation = statExplanations[statKey] || "Contextual benchmark from CRIQ analytics engine.";

  return (
    <button
      type="button"
      onClick={() => onExplain && onExplain(statKey, num)}
      className="group relative rounded border border-green/30 bg-green/10 px-3 py-2 text-left transition hover:glow-green hover:border-green/60"
    >
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
      <div className="font-stat text-lg text-green">{value}</div>
      
      {/* Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="rounded bg-navy-light p-2 text-xs text-white shadow-xl border border-white/20 whitespace-normal normal-case tracking-normal">
          {explanation}
        </div>
        <div className="mx-auto h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white/20"></div>
      </div>
    </button>
  );
}
