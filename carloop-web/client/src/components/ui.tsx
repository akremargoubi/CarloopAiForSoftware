import { useState } from 'react';

export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="stars" aria-label={`Note ${value} sur 5`}>
      <Icon name="star" className="filled" />
      {value > 0 ? value.toFixed(1) : '–'}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-input" role="radiogroup" aria-label="Votre note">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} sur 5`}
          className={n <= (hover || value) ? 'on' : ''}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
        >
          <Icon name="star" className="filled" />
        </button>
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <Icon name="error" />
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn-secondary btn-small" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}

export function Loading({ label = 'Chargement…' }: { label?: string }) {
  return <p className="muted loading">{label}</p>;
}
