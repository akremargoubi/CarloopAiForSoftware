import { describe, expect, it } from 'vitest';
import { mockDiagnostic } from '../mock.js';
import { diagnosticRequestSchema, diagnosticSchema } from '../schema.js';
import { buildContext } from '../service.js';

const valid = {
  reponse: 'Vos plaquettes de frein sont probablement usées.',
  causes_probables: [{ cause: 'Plaquettes usées', probabilite: 'élevée' }],
  urgence: 'Critique',
  service_recommande: 'mecanique',
  conseil_securite: 'Faites contrôler vos freins rapidement.',
};

describe('diagnostic schema', () => {
  it('accepts a valid answer and normalises accents and case', () => {
    const parsed = diagnosticSchema.parse(valid);
    expect(parsed.causes_probables[0].probabilite).toBe('elevee');
    expect(parsed.urgence).toBe('critique');
  });

  it('rejects unknown categories, urgencies and empty causes', () => {
    expect(diagnosticSchema.safeParse({ ...valid, service_recommande: 'plomberie' }).success).toBe(false);
    expect(diagnosticSchema.safeParse({ ...valid, urgence: 'immédiate' }).success).toBe(false);
    expect(diagnosticSchema.safeParse({ ...valid, causes_probables: [] }).success).toBe(false);
    expect(diagnosticSchema.safeParse({ reponse: 'ok' }).success).toBe(false);
  });

  it('validates the request body', () => {
    expect(diagnosticRequestSchema.safeParse({ message: 'Bruit au freinage', vehicule: { marque: 'Renault', annee: 2015 } }).success).toBe(true);
    expect(diagnosticRequestSchema.safeParse({ message: 'a' }).success).toBe(false);
    expect(diagnosticRequestSchema.safeParse({ message: 'Bruit', conversationId: 'xx' }).success).toBe(false);
    // The vehicle object does not accept extra (possibly personal) fields such as a plate number.
    expect(diagnosticRequestSchema.safeParse({ message: 'Bruit', vehicule: { immatriculation: '123 TU 4567' } }).success).toBe(false);
  });

  it('produces mocks that satisfy the schema', () => {
    for (const text of ['bruit au freinage', 'la clim souffle de l’air chaud', 'fumée blanche', 'texte quelconque']) {
      expect(diagnosticSchema.safeParse(mockDiagnostic(text)).success).toBe(true);
    }
    expect(mockDiagnostic('il apparaît à froid', 'ma batterie est faible').service_recommande).toBe('electricite');
  });

  it('sends at most 10 messages and adds the vehicle to the first user message', () => {
    const history = Array.from({ length: 14 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: `m${i}` }));
    const messages = buildContext(history, 'nouveau', '[Véhicule : Peugeot 208 2019]\n');
    expect(messages).toHaveLength(10);
    expect(messages.at(-1)).toEqual({ role: 'user', content: 'nouveau' });
    expect(messages.find((m) => m.role === 'user')?.content.startsWith('[Véhicule : Peugeot 208 2019]')).toBe(true);
  });
});
