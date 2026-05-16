interface Props {
  open: boolean;
  explanation: string;
  stat: string;
  onClose: () => void;
}

export default function StatExplainerDrawer({ open, explanation, stat, onClose }: Props) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} aria-hidden />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border border-green/30 bg-navy-light p-6 chart-animate md:left-64"
        role="dialog"
        aria-label="Stat explanation"
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20" />
        <h3 className="font-stat text-sm uppercase text-green">{stat.replace(/_/g, ' ')}</h3>
        <p className="mt-2 text-base leading-relaxed text-white/90">{explanation}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded border border-white/20 py-2 text-sm hover:bg-white/5"
        >
          Close
        </button>
      </div>
    </>
  );
}
