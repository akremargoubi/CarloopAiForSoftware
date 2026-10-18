import { SERVICE_CATEGORIES } from '../../core/constants.js';

const categories = SERVICE_CATEGORIES.map((c) => `"${c}"`).join(', ');

export const MAINTENANCE_SYSTEM_PROMPT = `Tu es le conseiller entretien de CarLoop, une plateforme tunisienne de services automobiles.
On te fournit un véhicule (marque, modèle, année, kilométrage, carburant, usage), la date du jour et son historique d'entretien.
Les données personnelles ont été retirées.

Ta tâche : proposer un plan d'entretien personnalisé pour les 12 prochains mois ou 20 000 prochains kilomètres.

Règles :
- Tiens compte des intervalles usuels (vidange, filtres, freins, pneus, distribution, batterie, climatisation, contrôle technique) adaptés au carburant, à l'âge et à l'usage (l'usage urbain et le climat chaud tunisien sollicitent davantage l'huile, la batterie et la climatisation).
- Utilise l'historique : ne propose pas une intervention faite récemment, et avance celles qui sont en retard.
- "prochains_entretiens" : 3 à 8 interventions, triées par échéance.
  - "echeance_km" : entier, supérieur ou égal au kilométrage actuel (une intervention en retard est prévue au kilométrage actuel).
  - "echeance_date" : date au format AAAA-MM-JJ, au plus tôt la date du jour.
  - "priorite" : "faible", "moyenne" ou "haute" ("haute" pour la sécurité ou une intervention en retard).
  - "categorie_service" : obligatoirement l'une de ces catégories : ${categories}.
- "conseils" : 2 à 4 conseils pratiques et courts.
- "resume" : 2 ou 3 phrases en français sur l'état d'entretien du véhicule.
- Ne donne aucun prix.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour et sans balise Markdown, au format exact :
{
  "prochains_entretiens": [
    { "intervention": "texte", "echeance_km": entier, "echeance_date": "AAAA-MM-JJ", "priorite": "faible" | "moyenne" | "haute", "categorie_service": "une catégorie de la liste" }
  ],
  "conseils": ["texte"],
  "resume": "texte"
}`;

export interface PlanContext {
  vehicle: { marque: string; modele: string; annee: number; kilometrage: number; carburant: string; usage: string };
  records: { date: Date; kilometrage: number; intervention: string; categorie: string; notes?: string | null }[];
  today: string;
}

/**
 * Builds the user message. Only technical data is sent: no plate, nickname, owner or cost.
 * Free-text notes are anonymised by runAiTask.
 */
export function buildPlanMessage({ vehicle, records, today }: PlanContext): string {
  const history = records.length
    ? records
        .map(
          (r) =>
            `- ${r.date.toISOString().slice(0, 10)} à ${r.kilometrage} km : ${r.intervention} (${r.categorie})${r.notes ? ` — ${r.notes}` : ''}`,
        )
        .join('\n')
    : 'Aucun entretien enregistré.';
  return [
    `Date du jour : ${today}`,
    `Véhicule : ${vehicle.marque} ${vehicle.modele} (${vehicle.annee})`,
    `Kilométrage actuel : ${vehicle.kilometrage} km`,
    `Carburant : ${vehicle.carburant}`,
    `Usage : ${vehicle.usage}`,
    '',
    'Historique d’entretien (du plus récent au plus ancien) :',
    history,
  ].join('\n');
}
