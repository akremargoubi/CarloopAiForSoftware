export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-primary-500 border-t-transparent ${className}`}
      aria-hidden
    />
  );
}

export function Loader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-slate-600" role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

/** Loader used while waiting for an AI answer. */
export function AiLoader({ label = 'L’assistant IA réfléchit…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-primary-50 px-4 py-3 text-primary-800" role="status">
      <span className="flex gap-1" aria-hidden>
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary-500 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary-500 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary-500" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
