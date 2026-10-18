/** Read-only star rating, or an input when `onChange` is given. */
export function Stars({ value, onChange, size = 'text-base' }: { value: number; onChange?: (v: number) => void; size?: string }) {
  return (
    <span className={`inline-flex ${size}`} aria-label={`${value} sur 5`} role={onChange ? 'radiogroup' : 'img'}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
            onClick={() => onChange(n)}
            className={`px-0.5 ${n <= value ? 'text-amber-500' : 'text-slate-300'} hover:scale-110`}
          >
            ★
          </button>
        ) : (
          <span key={n} className={n <= Math.round(value) ? 'text-amber-500' : 'text-slate-300'} aria-hidden>
            ★
          </span>
        ),
      )}
    </span>
  );
}
