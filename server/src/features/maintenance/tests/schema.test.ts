import { describe, expect, it } from 'vitest';
import { mockMaintenancePlan } from '../mock.js';
import { planSchemaFor, recordBodySchema, vehicleBodySchema } from '../schema.js';

const today = '2026-10-13';
const item = { intervention: 'Vidange moteur', echeance_km: 70000, echeance_date: '2026-12-01', priorite: 'Moyenne', categorie_service: 'Vidange' };
const plan = { prochains_entretiens: [item], conseils: ['Vérifiez la pression des pneus.'], resume: 'Véhicule globalement bien entretenu.' };
const vehicle = { marque: 'Peugeot', modele: '208', annee: 2019, kilometrage: 68000, carburant: 'essence', usage: 'urbain' };

const monthsBefore = (n: number) => {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d;
};

describe('maintenance schemas', () => {
  it('accepts a valid plan and normalises priority and category', () => {
    const parsed = planSchemaFor(68000, today).parse(plan);
    expect(parsed.prochains_entretiens[0]).toMatchObject({ priorite: 'moyenne', categorie_service: 'vidange' });
  });

  it('rejects deadlines before the current mileage or before today', () => {
    const schema = planSchemaFor(68000, today);
    expect(schema.safeParse({ ...plan, prochains_entretiens: [{ ...item, echeance_km: 60000 }] }).success).toBe(false);
    expect(schema.safeParse({ ...plan, prochains_entretiens: [{ ...item, echeance_date: '2026-01-01' }] }).success).toBe(false);
    expect(schema.safeParse({ ...plan, prochains_entretiens: [{ ...item, echeance_date: '01/12/2026' }] }).success).toBe(false);
  });

  it('rejects an unknown category or an empty plan', () => {
    const schema = planSchemaFor(68000, today);
    expect(schema.safeParse({ ...plan, prochains_entretiens: [{ ...item, categorie_service: 'peinture' }] }).success).toBe(false);
    expect(schema.safeParse({ ...plan, prochains_entretiens: [] }).success).toBe(false);
  });

  it('validates vehicles and history records', () => {
    expect(vehicleBodySchema.parse({ ...vehicle, usage: undefined }).usage).toBe('mixte');
    expect(vehicleBodySchema.safeParse({ ...vehicle, carburant: 'kerosene' }).success).toBe(false);
    expect(vehicleBodySchema.safeParse({ ...vehicle, annee: 1950 }).success).toBe(false);
    expect(recordBodySchema.safeParse({ date: '2026-01-10', kilometrage: 60000, intervention: 'Vidange', categorie: 'vidange' }).success).toBe(true);
    expect(recordBodySchema.safeParse({ date: '10/01/2026', kilometrage: 60000, intervention: 'Vidange', categorie: 'vidange' }).success).toBe(false);
  });
});

describe('mockMaintenancePlan', () => {
  it('produces a plan that satisfies the contextual schema', () => {
    const mock = mockMaintenancePlan({ vehicle, records: [], today });
    expect(planSchemaFor(vehicle.kilometrage, today).safeParse(mock).success).toBe(true);
    expect(mock.conseils.some((c) => c.includes('Enregistrez'))).toBe(true);
  });

  it('marks an overdue oil change as high priority and schedules the next one after a recent change', () => {
    const overdue = mockMaintenancePlan({
      vehicle,
      records: [{ date: monthsBefore(14), kilometrage: 55000, intervention: 'Vidange + filtre à huile', categorie: 'vidange' }],
      today,
    });
    const oil = overdue.prochains_entretiens.find((i) => i.intervention.startsWith('Vidange'));
    expect(oil).toMatchObject({ priorite: 'haute', echeance_km: 68000, echeance_date: today });

    const recent = mockMaintenancePlan({
      vehicle,
      records: [{ date: monthsBefore(1), kilometrage: 67000, intervention: 'Vidange', categorie: 'vidange' }],
      today,
    });
    const next = recent.prochains_entretiens.find((i) => i.intervention.startsWith('Vidange'));
    expect(next?.priorite).not.toBe('haute');
    expect(next?.echeance_km).toBe(77000);
  });

  it('adapts the interventions to the fuel type', () => {
    const ev = mockMaintenancePlan({ vehicle: { ...vehicle, carburant: 'electrique', kilometrage: 40000 }, records: [], today });
    expect(ev.prochains_entretiens.some((i) => i.intervention.startsWith('Vidange'))).toBe(false);
    expect(planSchemaFor(40000, today).safeParse(ev).success).toBe(true);
  });
});
