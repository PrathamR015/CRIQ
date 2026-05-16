export default function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red/40 bg-red/10 p-6 text-center">
      <p className="mb-4 text-red">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded bg-green px-4 py-2 font-semibold text-navy hover:opacity-90"
      >
        Retry
      </button>
    </div>
  );
}
