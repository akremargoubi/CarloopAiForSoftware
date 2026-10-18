import type { ServiceCategory } from '../../core/constants.js';
import type { EstimateRequest, QuoteEstimate } from './schema.js';

interface Template {
  base: [number, number];
  hours: number;
  parts: [string, number][];
}

const TEMPLATES: Record<ServiceCategory, Template> = {
  lavage: { base: [15, 45], hours: 1, parts: [] },
  vidange: { base: [90, 170], hours: 0.75, parts: [['Huile moteur (4 à 5 L)', 75], ['Filtre à huile', 20], ['Joint de bouchon de vidange', 3]] },
  pneus: { base: [180, 420], hours: 0.5, parts: [['Pneu (par unité)', 200], ['Valve', 5]] },
  climatisation: { base: [100, 220], hours: 1, parts: [['Gaz réfrigérant R134a', 70], ['Filtre d’habitacle', 25]] },
  electricite: { base: [60, 380], hours: 1, parts: [['Batterie 60 Ah', 260], ['Fusibles et cosses', 15]] },
  carrosserie: { base: [150, 700], hours: 4, parts: [['Peinture et vernis', 180], ['Mastic et apprêt', 40]] },
  mecanique: { base: [250, 1200], hours: 4, parts: [['Plaquettes de frein (jeu)', 110], ['Disques de frein (paire)', 220]] },
  depannage: { base: [50, 150], hours: 1, parts: [] },
};

const PREMIUM = /bmw|mercedes|audi|volkswagen|vw|volvo|land rover|porsche|lexus/i;

/** Simulated estimation for the demo mode, adjusted to the brand, age and mileage. */
export function mockEstimate(input: EstimateRequest, catalogPrice?: number): QuoteEstimate {
  const t = TEMPLATES[input.categorie];
  const age = Math.max(0, new Date().getFullYear() - input.vehicule.annee);
  let factor = 1;
  if (PREMIUM.test(input.vehicule.marque)) factor += 0.35;
  if (age > 10) factor += 0.1;
  if (input.vehicule.kilometrage > 200_000) factor += 0.1;
  if (input.vehicule.carburant === 'diesel' && input.categorie === 'vidange') factor += 0.15;

  let [min, max] = t.base.map((v) => Math.round(v * factor));
  if (catalogPrice) {
    min = Math.round(catalogPrice * 0.9);
    max = Math.max(min, Math.round(catalogPrice * 1.3));
  }
  return {
    prix_min_tnd: min,
    prix_max_tnd: max,
    pieces_probables: t.parts.map(([piece, price]) => ({ piece, prix_estime_tnd: Math.round(price * factor) })),
    main_oeuvre_heures: t.hours,
    hypotheses: [
      `Véhicule ${input.vehicule.marque} ${input.vehicule.modele} de ${input.vehicule.annee} (${input.vehicule.kilometrage.toLocaleString('fr-FR')} km)`,
      catalogPrice ? `Prix catalogue du prestataire pris comme référence (${catalogPrice} TND)` : 'Tarifs moyens constatés dans le Grand Tunis',
      'Aucune pièce supplémentaire découverte lors de l’inspection',
    ],
    avertissement: 'Estimation indicative générée en mode démo : seul le devis du professionnel après inspection fait foi.',
  };
}
