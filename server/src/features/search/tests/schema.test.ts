import { describe, expect, it } from 'vitest';
import { mockExtraction } from '../mock.js';
import { extractionSchema, rankingSchema, searchRequestSchema } from '../schema.js';

describe('search schemas', () => {
  it('accepts a valid extraction and normalises city, category and moment', () => {
    const parsed = extractionSchema.parse({
      categorie: 'Vidange',
      ville: "l'Ariana",
      budget_max: 120,
      disponibilite: { jour: 'Samedi', moment: 'après-midi' },
      criteres: ['pas cher'],
    });
    expect(parsed).toEqual({
      categorie: 'vidange',
      ville: 'Ariana',
      budget_max: 120,
      disponibilite: { jour: 'samedi', moment: 'apres-midi' },
      criteres: ['pas cher'],
    });
  });

  it('maps an unknown city to null instead of failing', () => {
    const parsed = extractionSchema.parse({ categorie: null, ville: 'Paris', budget_max: null, disponibilite: null, criteres: [] });
    expect(parsed.ville).toBeNull();
  });

  it('rejects an unknown category, a negative budget or missing keys', () => {
    expect(extractionSchema.safeParse({ categorie: 'plomberie', ville: null, budget_max: null, disponibilite: null, criteres: [] }).success).toBe(false);
    expect(extractionSchema.safeParse({ categorie: null, ville: null, budget_max: -5, disponibilite: null, criteres: [] }).success).toBe(false);
    expect(extractionSchema.safeParse({ categorie: null }).success).toBe(false);
  });

  it('validates the ranking format', () => {
    expect(rankingSchema.safeParse({ resultats: [{ providerId: 'abc', justification: 'Bon prix et bien noté' }] }).success).toBe(true);
    expect(rankingSchema.safeParse({ resultats: [{ providerId: 'abc' }] }).success).toBe(false);
    expect(rankingSchema.safeParse({ results: [] }).success).toBe(false);
  });

  it('validates the request body', () => {
    expect(searchRequestSchema.safeParse({ query: 'a' }).success).toBe(false);
    expect(searchRequestSchema.parse({ query: 'vidange', filtres: { categorie: 'vidange' } }).filtres).toMatchObject({
      categorie: 'vidange',
      ville: null,
      criteres: [],
    });
  });

  it('produces mocks that satisfy the schema', () => {
    const mock = mockExtraction('Vidange pas chère près de l’Ariana samedi matin, moins de 120 dt');
    expect(extractionSchema.parse(mock)).toEqual({
      categorie: 'vidange',
      ville: 'Ariana',
      budget_max: 120,
      disponibilite: { jour: 'samedi', moment: 'matin' },
      criteres: ['pas cher'],
    });
  });
});
