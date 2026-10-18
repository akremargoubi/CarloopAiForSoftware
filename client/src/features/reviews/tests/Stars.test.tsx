import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Stars } from '../components/Stars';

describe('Stars', () => {
  it('displays a read-only rating', () => {
    render(<Stars value={4} />);
    expect(screen.getByRole('img', { name: '4 sur 5' })).toBeInTheDocument();
  });

  it('acts as a rating input', () => {
    const onChange = vi.fn();
    render(<Stars value={2} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: '5 étoiles' }));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
