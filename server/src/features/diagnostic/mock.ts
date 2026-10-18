import type { DiagnosticResult } from './schema.js';

interface Rule {
  match: RegExp;
  result: DiagnosticResult;
}

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Demo mode: realistic answers selected by keywords.
const RULES: Rule[] = [
  {
    match: /frein|freinage|grince|pedale/,
    result: {
      reponse:
        'Un bruit au freinage indique le plus souvent des plaquettes usées. Si le bruit est métallique ou si la pédale devient molle, il faut faire contrôler le système de freinage rapidement. Le bruit apparaît-il à chaque freinage ou seulement à froid ?',
      causes_probables: [
        { cause: 'Plaquettes de frein usées (témoin d’usure qui frotte)', probabilite: 'elevee' },
        { cause: 'Disques de frein voilés ou rayés', probabilite: 'moyenne' },
        { cause: 'Étrier de frein grippé', probabilite: 'faible' },
      ],
      urgence: 'critique',
      service_recommande: 'mecanique',
      conseil_securite: 'Augmentez les distances de sécurité et évitez les longs trajets jusqu’au contrôle des freins.',
    },
  },
  {
    match: /batterie|demarre pas|demarrage|voyant batterie|alternateur/,
    result: {
      reponse:
        'Un démarrage difficile ou un voyant batterie allumé vient généralement de la batterie ou du circuit de charge. Un test de la batterie et de l’alternateur permet de trancher en quelques minutes.',
      causes_probables: [
        { cause: 'Batterie en fin de vie ou déchargée', probabilite: 'elevee' },
        { cause: 'Alternateur qui ne recharge plus correctement', probabilite: 'moyenne' },
        { cause: 'Cosses de batterie oxydées ou desserrées', probabilite: 'moyenne' },
      ],
      urgence: 'moyenne',
      service_recommande: 'electricite',
      conseil_securite: 'Évitez de couper le moteur loin de chez vous et ne laissez pas d’accessoires allumés moteur arrêté.',
    },
  },
  {
    match: /clim|climatisation|air chaud|ne refroidit/,
    result: {
      reponse:
        'Une climatisation qui ne refroidit plus manque le plus souvent de gaz, à cause d’une petite fuite. Une recherche de fuite suivie d’une recharge règle la majorité des cas.',
      causes_probables: [
        { cause: 'Manque de gaz réfrigérant (fuite lente)', probabilite: 'elevee' },
        { cause: 'Filtre d’habitacle encrassé', probabilite: 'moyenne' },
        { cause: 'Compresseur ou embrayage de compresseur défaillant', probabilite: 'faible' },
      ],
      urgence: 'faible',
      service_recommande: 'climatisation',
      conseil_securite: 'Par forte chaleur, aérez l’habitacle avant de rouler et hydratez-vous lors des longs trajets.',
    },
  },
  {
    match: /fumee|surchauffe|temperature|liquide de refroidissement|radiateur/,
    result: {
      reponse:
        'Une surchauffe ou de la fumée blanche peut venir d’un manque de liquide de refroidissement ou d’un problème de joint de culasse. Continuer à rouler peut gravement endommager le moteur.',
      causes_probables: [
        { cause: 'Fuite ou manque de liquide de refroidissement', probabilite: 'elevee' },
        { cause: 'Ventilateur de radiateur ou thermostat défaillant', probabilite: 'moyenne' },
        { cause: 'Joint de culasse endommagé', probabilite: 'faible' },
      ],
      urgence: 'critique',
      service_recommande: 'mecanique',
      conseil_securite: 'Arrêtez-vous dès que possible et n’ouvrez jamais le bouchon du radiateur moteur chaud.',
    },
  },
  {
    match: /fuite|huile|tache|goutte/,
    result: {
      reponse:
        'Une tache sous le véhicule peut être de l’huile moteur, du liquide de refroidissement ou du liquide de frein selon sa couleur. Une huile noire ou brune indique souvent un joint ou un filtre à huile qui fuit.',
      causes_probables: [
        { cause: 'Joint de carter ou bouchon de vidange qui fuit', probabilite: 'elevee' },
        { cause: 'Filtre à huile mal serré après une vidange', probabilite: 'moyenne' },
        { cause: 'Joint de culasse ou joint spi usé', probabilite: 'faible' },
      ],
      urgence: 'moyenne',
      service_recommande: 'vidange',
      conseil_securite: 'Vérifiez le niveau d’huile moteur froid avant chaque trajet et complétez si nécessaire.',
    },
  },
  {
    match: /pneu|vibration|volant tremble|crevaison|tire/,
    result: {
      reponse:
        'Des vibrations dans le volant viennent souvent d’un défaut d’équilibrage des roues ou d’un pneu déformé. Un contrôle de l’équilibrage et du parallélisme est recommandé.',
      causes_probables: [
        { cause: 'Roues mal équilibrées', probabilite: 'elevee' },
        { cause: 'Pneu endommagé (hernie) ou usure irrégulière', probabilite: 'moyenne' },
        { cause: 'Parallélisme déréglé', probabilite: 'moyenne' },
      ],
      urgence: 'moyenne',
      service_recommande: 'pneus',
      conseil_securite: 'Contrôlez la pression des pneus à froid et inspectez-les visuellement à la recherche d’une hernie.',
    },
  },
];

const DEFAULT_RESULT: DiagnosticResult = {
  reponse:
    'Merci pour ces informations. Pour affiner le diagnostic, pouvez-vous préciser quand le symptôme apparaît (à froid, en roulant, au freinage) et si un voyant est allumé au tableau de bord ?',
  causes_probables: [
    { cause: 'Usure normale d’une pièce mécanique à identifier', probabilite: 'moyenne' },
    { cause: 'Problème électrique ou capteur défaillant', probabilite: 'faible' },
  ],
  urgence: 'moyenne',
  service_recommande: 'mecanique',
  conseil_securite: 'Si un voyant rouge s’allume, arrêtez-vous dans un endroit sûr et coupez le moteur.',
};

/** Simulated answer for the demo mode: the latest message first, then the previous ones. */
export function mockDiagnostic(latestMessage: string, previousMessages = ''): DiagnosticResult {
  for (const text of [plain(latestMessage), plain(previousMessages)]) {
    const rule = RULES.find((r) => r.match.test(text));
    if (rule) return rule.result;
  }
  return DEFAULT_RESULT;
}
