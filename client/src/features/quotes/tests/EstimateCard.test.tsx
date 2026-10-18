import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EstimateCard } from '../components/EstimateCard';
import { StatusBadge } from '../components/StatusBadge';

const estimate = {
  prix_min_tnd: 120,
  prix_max_tnd: 180,
  pieces_probables: [{ piece: 'Filtre à huile', prix_estime_tnd: 20 }],
  main_oeuvre_heures: 1,
  hypotheses: ['Huile 10W40'],
  avertissement: 'Seul le devis du professionnel fait foi.',
};

describe('quotes components', () => {
  it('renders the price range, parts, hypotheses and warning', () => {
    render(<EstimateCard estimate={estimate} />);
    expect(screen.getByText(/120.*180/)).toBeInTheDocument();
    expect(screen.getByText('Filtre à huile')).toBeInTheDocument();
    expect(screen.getByText('Huile 10W40')).toBeInTheDocument();
    expect(screen.getByText(/fait foi/)).toBeInTheDocument();
  });

  it('hides the details in compact mode', () => {
    render(<EstimateCard estimate={estimate} compact />);
    expect(screen.queryByText('Filtre à huile')).toBeNull();
  });

  it('translates booking statuses', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('Terminée')).toBeInTheDocument();
  });
});
