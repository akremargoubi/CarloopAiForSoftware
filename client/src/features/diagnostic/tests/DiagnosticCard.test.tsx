import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Diagnostic } from '../api';
import { DiagnosticCard, searchLinkFor } from '../components/DiagnosticCard';

const diagnostic: Diagnostic = {
  reponse: 'Vos plaquettes sont probablement usées.',
  causes_probables: [{ cause: 'Plaquettes usées', probabilite: 'elevee' }],
  urgence: 'critique',
  service_recommande: 'mecanique',
  conseil_securite: 'Faites contrôler les freins rapidement.',
};

describe('DiagnosticCard', () => {
  it('shows the urgency, the causes and the safety tip', () => {
    render(
      <MemoryRouter>
        <DiagnosticCard diagnostic={diagnostic} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Urgence critique')).toBeInTheDocument();
    expect(screen.getByText('Plaquettes usées')).toBeInTheDocument();
    expect(screen.getByText(/Faites contrôler/)).toBeInTheDocument();
  });

  it('links to the search module pre-filled with the recommended category', () => {
    const link = searchLinkFor(diagnostic);
    expect(link.startsWith('/recherche?')).toBe(true);
    const params = new URLSearchParams(link.split('?')[1]);
    expect(params.get('categorie')).toBe('mecanique');
    expect(params.get('q')).toContain('Plaquettes usées');
  });
});
