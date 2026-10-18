import { describe, expect, it } from 'vitest';
import { mockEstimate } from '../mock.js';
import { createBookingSchema, estimateRequestSchema, quoteEstimateSchema } from '../schema.js';

const estimate = {
  prix_min_tnd: 120,
  prix_max_tnd: 180,
  pieces_probables: [{ piece: 'Filtre à huile', prix_estime_tnd: 20 }],
  main_oeuvre_heures: 1,
  hypotheses: ['Huile 10W40'],
  avertissement: 'Estimation indicative.',
};

const vehicule = { marque: 'Renault', modele: 'Clio', annee: 2015, kilometrage: 120000, carburant: 'diesel' };

describe('quote schemas', () => {
  it('accepts a valid estimation', () => {
    expect(quoteEstimateSchema.safeParse(estimate).success).toBe(true);
  });

  it('rejects prix_min > prix_max', () => {
    const res = quoteEstimateSchema.safeParse({ ...estimate, prix_min_tnd: 200 });
    expect(res.success).toBe(false);
    expect(res.error?.issues[0].path).toEqual(['prix_min_tnd']);
  });

  it('rejects zero or negative prices', () => {
    expect(quoteEstimateSchema.safeParse({ ...estimate, prix_min_tnd: 0 }).success).toBe(false);
    expect(quoteEstimateSchema.safeParse({ ...estimate, pieces_probables: [{ piece: 'Filtre', prix_estime_tnd: -3 }] }).success).toBe(false);
    expect(quoteEstimateSchema.safeParse({ ...estimate, main_oeuvre_heures: -1 }).success).toBe(false);
  });

  it('validates the estimation request', () => {
    expect(estimateRequestSchema.safeParse({ vehicule, categorie: 'vidange' }).success).toBe(true);
    expect(estimateRequestSchema.safeParse({ vehicule: { ...vehicule, carburant: 'charbon' }, categorie: 'vidange' }).success).toBe(false);
    expect(estimateRequestSchema.safeParse({ vehicule: { ...vehicule, annee: 1900 }, categorie: 'vidange' }).success).toBe(false);
  });

  it('validates the booking request', () => {
    const base = { providerId: '65f000000000000000000000', serviceId: '65f000000000000000000001', scheduledAt: '2030-01-05T08:00:00.000Z', vehicule };
    expect(createBookingSchema.safeParse(base).success).toBe(true);
    expect(createBookingSchema.safeParse({ ...base, estimation: { ...estimate, prix_max_tnd: 10 } }).success).toBe(false);
  });

  it('produces mocks that satisfy the schema for every category', () => {
    for (const categorie of ['lavage', 'vidange', 'pneus', 'climatisation', 'electricite', 'carrosserie', 'mecanique', 'depannage'] as const) {
      const input = estimateRequestSchema.parse({ vehicule: { ...vehicule, marque: 'BMW' }, categorie });
      expect(quoteEstimateSchema.safeParse(mockEstimate(input)).success).toBe(true);
      expect(quoteEstimateSchema.safeParse(mockEstimate(input, 95)).success).toBe(true);
    }
  });
});
