import type { ServiceCategory } from '../../core/constants.js';
import type { MaintenancePlan, PlanItem, Priority } from './schema.js';
import type { PlanContext } from './prompt.js';

interface Rule {
  intervention: string;
  categorie: ServiceCategory;
  /** Interval in km (Infinity when the intervention only depends on time). */
  km: number;
  months: number;
  priority: Priority;
  /** Matches an intervention of the history (accent-free, lower case). */
  done: RegExp;
  applies?: (fuel: string) => boolean;
}

const thermal = (fuel: string) => fuel !== 'electrique';

const RULES: Rule[] = [
  { intervention: 'Vidange moteur et filtre à huile', categorie: 'vidange', km: 10_000, months: 12, priority: 'moyenne', done: /vidange|huile/, applies: thermal },
  { intervention: 'Remplacement du filtre à air et du filtre d’habitacle', categorie: 'vidange', km: 20_000, months: 24, priority: 'faible', done: /filtre a air|habitacle|filtres/ },
  { intervention: 'Contrôle des plaquettes et disques de frein', categorie: 'mecanique', km: 20_000, months: 12, priority: 'moyenne', done: /frein|plaquette/ },
  { intervention: 'Contrôle de l’usure, permutation et parallélisme des pneus', categorie: 'pneus', km: 10_000, months: 12, priority: 'faible', done: /pneu|permutation|parallelisme|equilibrage/ },
  { intervention: 'Contrôle et recharge de la climatisation', categorie: 'climatisation', km: Infinity, months: 12, priority: 'faible', done: /clim/ },
  { intervention: 'Test de la batterie et du circuit de charge', categorie: 'electricite', km: Infinity, months: 24, priority: 'faible', done: /batterie|alternateur/ },
  { intervention: 'Remplacement du kit de distribution', categorie: 'mecanique', km: 100_000, months: 72, priority: 'haute', done: /distribution|courroie/, applies: thermal },
  { intervention: 'Remplacement du liquide de refroidissement', categorie: 'mecanique', km: 60_000, months: 48, priority: 'moyenne', done: /refroidissement/, applies: thermal },
  { intervention: 'Remplacement des bougies d’allumage', categorie: 'mecanique', km: 60_000, months: 60, priority: 'faible', done: /bougie/, applies: (f) => ['essence', 'gpl', 'hybride'].includes(f) },
  { intervention: 'Contrôle du système haute tension et de la batterie de traction', categorie: 'electricite', km: 30_000, months: 24, priority: 'moyenne', done: /haute tension|batterie de traction/, applies: (f) => f === 'electrique' || f === 'hybride' },
];

const KM_PER_MONTH: Record<string, number> = { urbain: 1000, mixte: 1500, autoroute: 2500 };
const HORIZON_KM = 20_000;
const HORIZON_MONTHS = 12;

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function addMonths(isoDay: string, months: number): string {
  const d = new Date(`${isoDay}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + Math.round(months));
  return d.toISOString().slice(0, 10);
}

const minDate = (a: string, b: string) => (a < b ? a : b);

/** Simulated maintenance plan computed from usual intervals, the usage and the history. */
export function mockMaintenancePlan({ vehicle, records, today }: PlanContext): MaintenancePlan {
  const kmPerMonth = KM_PER_MONTH[vehicle.usage] ?? 1500;
  const age = Math.max(0, Number(today.slice(0, 4)) - vehicle.annee);
  const items: (PlanItem & { overdue: boolean })[] = [];

  for (const rule of RULES) {
    if (rule.applies && !rule.applies(vehicle.carburant)) continue;
    const last = records
      .filter((r) => rule.done.test(plain(r.intervention)))
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

    let dueKm: number;
    let dueDate: string;
    if (last) {
      dueKm = Number.isFinite(rule.km) ? last.kilometrage + rule.km : vehicle.kilometrage;
      dueDate = addMonths(last.date.toISOString().slice(0, 10), rule.months);
    } else {
      // Never recorded: due now if the vehicle is old enough, otherwise at the first interval.
      const kmReached = Number.isFinite(rule.km) && vehicle.kilometrage >= rule.km;
      const ageReached = age * 12 >= rule.months;
      dueKm = Number.isFinite(rule.km) && !kmReached ? rule.km : vehicle.kilometrage;
      dueDate = kmReached || ageReached ? today : addMonths(today, Math.min(rule.months, HORIZON_MONTHS));
    }
    if (Number.isFinite(rule.km) && dueKm > vehicle.kilometrage) {
      dueDate = minDate(dueDate, addMonths(today, (dueKm - vehicle.kilometrage) / kmPerMonth));
    }

    const overdue = dueKm <= vehicle.kilometrage && dueDate <= today;
    if (dueKm < vehicle.kilometrage) dueKm = vehicle.kilometrage;
    if (dueDate < today) dueDate = today;
    if (dueKm - vehicle.kilometrage > HORIZON_KM || dueDate > addMonths(today, HORIZON_MONTHS)) continue;

    items.push({
      intervention: rule.intervention,
      echeance_km: dueKm,
      echeance_date: dueDate,
      priorite: overdue ? 'haute' : rule.priority,
      categorie_service: rule.categorie,
      overdue,
    });
  }

  if (items.length === 0) {
    items.push({
      intervention: 'Contrôle général et vérification des niveaux',
      echeance_km: vehicle.kilometrage + 10_000,
      echeance_date: addMonths(today, 6),
      priorite: 'faible',
      categorie_service: 'mecanique',
      overdue: false,
    });
  }

  items.sort((a, b) => a.echeance_date.localeCompare(b.echeance_date) || a.echeance_km - b.echeance_km);
  const overdueCount = items.filter((i) => i.overdue).length;
  const selected = items.slice(0, 8).map(({ overdue: _overdue, ...item }) => item);

  const conseils = [
    'Vérifiez le niveau d’huile et la pression des pneus une fois par mois, moteur froid.',
    vehicle.usage === 'urbain'
      ? 'En usage urbain (trajets courts, bouchons), l’huile et la batterie s’usent plus vite : ne dépassez pas les échéances.'
      : 'Sur autoroute, contrôlez l’état des pneus et des freins avant chaque long trajet.',
    'Avant l’été, faites contrôler la climatisation et le circuit de refroidissement.',
  ];
  if (records.length === 0) conseils.push('Enregistrez vos entretiens dans CarLoop pour obtenir un plan plus précis.');

  const resume =
    `${vehicle.marque} ${vehicle.modele} de ${vehicle.annee} à ${vehicle.kilometrage.toLocaleString('fr-FR')} km, usage ${vehicle.usage}. ` +
    (overdueCount
      ? `${overdueCount} intervention(s) semblent en retard et sont à prévoir rapidement. `
      : 'Aucune intervention en retard d’après l’historique. ') +
    `Le plan couvre les 12 prochains mois (environ ${(kmPerMonth * 12).toLocaleString('fr-FR')} km).`;

  return { prochains_entretiens: selected, conseils, resume };
}
