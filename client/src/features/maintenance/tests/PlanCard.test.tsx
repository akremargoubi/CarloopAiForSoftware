import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { MaintenancePlan } from '../api';
import { PlanCard } from '../components/PlanCard';

const plan: MaintenancePlan = {
  prochains_entretiens: [
    { intervention: 'Vidange moteur et filtre à huile', echeance_km: 68000, echeance_date: '2026-10-13', priorite: 'haute', categorie_service: 'vidange' },
    { intervention: 'Contrôle de la climatisation', echeance_km: 70000, echeance_date: '2027-04-01', priorite: 'faible', categorie_service: 'climatisation' },
  ],
  conseils: ['Vérifiez la pression des pneus une fois par mois.'],
  resume: 'Une intervention est en retard et doit être prévue rapidement.',
};

describe('PlanCard', () => {
  it('renders the summary, interventions, priorities and advice', () => {
    render(<PlanCard plan={plan} vehicleId="v1" />, { wrapper: MemoryRouter });
    expect(screen.getByText(/en retard/)).toBeInTheDocument();
    expect(screen.getByText('Vidange moteur et filtre à huile')).toBeInTheDocument();
    expect(screen.getByText('Priorité haute')).toBeInTheDocument();
    expect(screen.getByText('Priorité faible')).toBeInTheDocument();
    expect(screen.getByText(/68\s000 km/)).toBeInTheDocument();
    expect(screen.getByText(/pression des pneus/)).toBeInTheDocument();
  });

  it('links each intervention to the booking form with the category and the vehicle', () => {
    render(<PlanCard plan={plan} vehicleId="v1" />, { wrapper: MemoryRouter });
    const href = screen.getAllByRole('link', { name: /Réserver/ })[1].getAttribute('href') ?? '';
    const params = new URLSearchParams(href.split('?')[1]);
    expect(href.startsWith('/reserver?')).toBe(true);
    expect(params.get('categorie')).toBe('climatisation');
    expect(params.get('vehicule')).toBe('v1');
    expect(params.get('description')).toBe('Contrôle de la climatisation');
  });
});
