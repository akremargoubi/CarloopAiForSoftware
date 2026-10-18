import { describe, expect, it } from 'vitest';
import { mockReply, mockSummary } from '../mock.js';
import { createReviewSchema, reviewReplySchema, reviewsSummarySchema } from '../schema.js';

const summary = {
  resume: 'Les clients apprécient la rapidité et le prix du garage.',
  sentiment_global: 'Mitigé',
  points_forts: ['Rapidité'],
  points_faibles: ['Attente'],
  score_confiance: 70,
};

describe('reviews schemas', () => {
  it('accepts a valid summary and normalises the sentiment', () => {
    expect(reviewsSummarySchema.parse(summary).sentiment_global).toBe('mitige');
  });

  it('rejects an out-of-range confidence score or an unknown sentiment', () => {
    expect(reviewsSummarySchema.safeParse({ ...summary, score_confiance: 120 }).success).toBe(false);
    expect(reviewsSummarySchema.safeParse({ ...summary, score_confiance: 0.7 }).success).toBe(false);
    expect(reviewsSummarySchema.safeParse({ ...summary, sentiment_global: 'neutre' }).success).toBe(false);
  });

  it('requires exactly two reply propositions', () => {
    const p = { ton: 'formel', texte: 'Merci pour votre avis, nous restons à votre écoute.' };
    expect(reviewReplySchema.safeParse({ propositions: [p, p] }).success).toBe(true);
    expect(reviewReplySchema.safeParse({ propositions: [p] }).success).toBe(false);
    expect(reviewReplySchema.safeParse({ propositions: [p, p, p] }).success).toBe(false);
  });

  it('validates a new review', () => {
    expect(createReviewSchema.safeParse({ bookingId: '65f000000000000000000000', rating: 5, comment: 'Très bon service' }).success).toBe(true);
    expect(createReviewSchema.safeParse({ bookingId: '65f000000000000000000000', rating: 6, comment: 'Très bon service' }).success).toBe(false);
    expect(createReviewSchema.safeParse({ bookingId: '65f000000000000000000000', rating: 3, comment: 'bof' }).success).toBe(false);
  });

  it('produces mocks that satisfy the schemas', () => {
    const good = mockSummary([{ rating: 5, comment: 'Accueil aimable et rapide' }, { rating: 4, comment: 'Prix correct' }]);
    expect(reviewsSummarySchema.parse(good).sentiment_global).toBe('positif');
    const bad = mockSummary([{ rating: 1, comment: 'Attente et facture plus élevée' }, { rating: 2, comment: 'Mal accueilli' }]);
    expect(bad.sentiment_global).toBe('negatif');
    expect(bad.points_faibles.length).toBeGreaterThan(0);
    expect(reviewReplySchema.safeParse(mockReply('Garage Test', { rating: 1 })).success).toBe(true);
    expect(reviewReplySchema.safeParse(mockReply('Garage Test', { rating: 5 })).success).toBe(true);
  });
});
