import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { AiErrorDisplay, describeAiError } from '../components/AiErrorDisplay';

describe('AiErrorDisplay', () => {
  it.each([
    ['AI_TIMEOUT', 'trop de temps'],
    ['AI_QUOTA_EXCEEDED', 'Quota'],
    ['AI_NOT_CONFIGURED', 'non configuré'],
    ['AI_INVALID_OUTPUT', 'inexploitable'],
  ])('shows a specific message for %s', (code, expected) => {
    render(<AiErrorDisplay error={new ApiError(500, code, 'x')} />);
    expect(screen.getByRole('alert')).toHaveTextContent(expected);
  });

  it('offers a retry button only for retryable errors', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<AiErrorDisplay error={new ApiError(504, 'AI_TIMEOUT', 'x')} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(<AiErrorDisplay error={new ApiError(503, 'AI_NOT_CONFIGURED', 'x')} onRetry={onRetry} />);
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull();
  });

  it('falls back to a generic message for unknown codes', () => {
    expect(describeAiError('SOMETHING').title).toBe('Une erreur est survenue');
  });
});
