import type { ReviewReplySuggestions, ReviewsSummary } from './schema.js';

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const THEMES: { label: [string, string]; positive: RegExp; negative: RegExp }[] = [
  { label: ['Accueil et amabilité', 'Accueil peu aimable'], positive: /accueil|aimable|sympa|souriant|courtois/, negative: /mal accueilli|desagreable|impoli|froid/ },
  { label: ['Rapidité du service', 'Délais et attente'], positive: /rapide|vite|a l'heure|ponctuel/, negative: /attente|retard|attendu|lent|long/ },
  { label: ['Prix raisonnables', 'Prix élevés ou surprises sur la facture'], positive: /prix correct|pas cher|raisonnable|bon prix|honnete/, negative: /cher|facture|surpris|arnaque|plus que prevu/ },
  { label: ['Travail soigné et compétent', 'Qualité du travail inégale'], positive: /professionnel|competent|soigne|impeccable|propre|serieux|efficace/, negative: /mal fait|pas regle|revenir|probleme persiste|rayure|sale/ },
  { label: ['Bons conseils et explications', 'Manque d’explications'], positive: /conseil|explique|transparent/, negative: /pas explique|aucune explication/ },
];

/** Simulated summary: computed from the ratings and recurring keywords. */
export function mockSummary(reviews: { rating: number; comment: string }[]): ReviewsSummary {
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const sentiment = avg >= 4 ? 'positif' : avg >= 2.75 ? 'mitige' : 'negatif';
  const texts = reviews.map((r) => plain(r.comment));
  const forts: string[] = [];
  const faibles: string[] = [];
  for (const t of THEMES) {
    if (texts.filter((x) => t.positive.test(x)).length >= 1) forts.push(t.label[0]);
    if (texts.filter((x) => t.negative.test(x)).length >= 1) faibles.push(t.label[1]);
  }
  const positives = reviews.filter((r) => r.rating >= 4).length;
  const negatives = reviews.filter((r) => r.rating <= 2).length;
  const resume =
    `Sur ${reviews.length} avis (moyenne ${avg.toFixed(1)}/5), ${positives} sont positifs et ${negatives} négatifs. ` +
    (sentiment === 'positif'
      ? 'Les clients sont globalement satisfaits de la prestation.'
      : sentiment === 'mitige'
        ? 'Les retours sont partagés : la qualité semble varier selon les interventions.'
        : 'Plusieurs clients se disent insatisfaits de la prestation.') +
    (faibles.length ? ` Point de vigilance : ${faibles[0].toLowerCase()}.` : '');
  return {
    resume,
    sentiment_global: sentiment,
    points_forts: forts.slice(0, 4),
    points_faibles: faibles.slice(0, 4),
    score_confiance: Math.min(95, 30 + reviews.length * 8),
  };
}

/** Simulated reply suggestions. */
export function mockReply(providerName: string, review: { rating: number }): ReviewReplySuggestions {
  if (review.rating >= 4) {
    return {
      propositions: [
        { ton: 'chaleureux', texte: `Merci beaucoup pour votre retour ! Nous sommes ravis que la prestation vous ait satisfait. Au plaisir de vous revoir bientôt. L'équipe ${providerName}` },
        { ton: 'formel', texte: `Nous vous remercions pour votre avis et pour votre confiance. Toute l'équipe reste à votre disposition pour vos prochains entretiens. L'équipe ${providerName}` },
      ],
    };
  }
  return {
    propositions: [
      { ton: 'empathique', texte: `Merci d'avoir pris le temps de partager votre expérience, et désolés qu'elle n'ait pas été à la hauteur. Nous vous invitons à repasser au garage afin que nous puissions vérifier ensemble le problème. L'équipe ${providerName}` },
      { ton: 'formel', texte: `Nous prenons note de vos remarques et les avons transmises à l'équipe technique. Contactez-nous directement afin de convenir d'un contrôle de l'intervention réalisée. L'équipe ${providerName}` },
    ],
  };
}
