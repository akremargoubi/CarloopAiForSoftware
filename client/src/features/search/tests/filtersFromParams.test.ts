import { describe, expect, it } from 'vitest';
import { filtersFromParams } from '../pages/ResultsPage';

describe('filtersFromParams', () => {
  it('returns null when the URL has no manual filter (AI extraction)', () => {
    expect(filtersFromParams(new URLSearchParams('q=vidange'))).toBeNull();
  });

  it('reads the filters pre-filled by another module (e.g. diagnostic)', () => {
    expect(filtersFromParams(new URLSearchParams('categorie=climatisation&ville=Sousse&jour=samedi'))).toEqual({
      categorie: 'climatisation',
      ville: 'Sousse',
      budget_max: null,
      disponibilite: { jour: 'samedi', moment: null },
      criteres: [],
    });
  });

  it('ignores invalid values and keeps an empty manual selection', () => {
    expect(filtersFromParams(new URLSearchParams('categorie=plomberie&budget_max=-3&manuel=1'))).toEqual({
      categorie: null,
      ville: null,
      budget_max: null,
      disponibilite: null,
      criteres: [],
    });
  });
});
