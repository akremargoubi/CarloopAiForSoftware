import type { SeedContext } from '../../core/types/feature.js';
import { MaintenanceRecordModel, VehicleModel } from './model.js';
import type { RecordBody, VehicleBody } from './schema.js';

type SeedRecord = Omit<RecordBody, 'date'> & { monthsAgo: number };

/** [client index, vehicle, history] */
const VEHICLES: [number, VehicleBody, SeedRecord[]][] = [
  [
    0,
    { marque: 'Peugeot', modele: '208', annee: 2019, kilometrage: 68000, carburant: 'essence', usage: 'urbain', plaque: '215 TU 4821', surnom: 'La 208' },
    [
      { monthsAgo: 14, kilometrage: 55200, intervention: 'Vidange + filtre à huile', categorie: 'vidange', coutTnd: 145 },
      { monthsAgo: 14, kilometrage: 55200, intervention: 'Contrôle des freins', categorie: 'mecanique', coutTnd: 30 },
      { monthsAgo: 26, kilometrage: 44800, intervention: 'Remplacement de 2 pneus avant', categorie: 'pneus', coutTnd: 420 },
      { monthsAgo: 30, kilometrage: 41000, intervention: 'Recharge climatisation', categorie: 'climatisation', coutTnd: 120 },
    ],
  ],
  [
    0,
    { marque: 'Volkswagen', modele: 'Golf 7', annee: 2016, kilometrage: 142000, carburant: 'diesel', usage: 'autoroute', surnom: 'Golf' },
    [
      { monthsAgo: 4, kilometrage: 135000, intervention: 'Vidange + filtres à air et habitacle', categorie: 'vidange', coutTnd: 210 },
      { monthsAgo: 20, kilometrage: 104000, intervention: 'Kit de distribution + pompe à eau', categorie: 'mecanique', coutTnd: 980, notes: 'Courroie d’accessoires changée aussi' },
      { monthsAgo: 9, kilometrage: 122000, intervention: 'Plaquettes de frein avant', categorie: 'mecanique', coutTnd: 160 },
    ],
  ],
  [
    1,
    { marque: 'Kia', modele: 'Picanto', annee: 2021, kilometrage: 31000, carburant: 'essence', usage: 'urbain' },
    [{ monthsAgo: 7, kilometrage: 24000, intervention: 'Vidange', categorie: 'vidange', coutTnd: 110 }],
  ],
  [2, { marque: 'Toyota', modele: 'Yaris Hybride', annee: 2022, kilometrage: 18500, carburant: 'hybride', usage: 'mixte' }, []],
];

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - n);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

/** Demo vehicles with a maintenance history for the first demo clients. */
export async function seedMaintenance({ clients }: SeedContext): Promise<void> {
  let records = 0;
  for (const [clientIndex, body, history] of VEHICLES) {
    const owner = clients[clientIndex];
    const vehicle = await VehicleModel.create({ ...body, owner: owner._id });
    for (const { monthsAgo: n, ...record } of history) {
      await MaintenanceRecordModel.create({ ...record, date: monthsAgo(n), vehicle: vehicle._id, owner: owner._id });
      records++;
    }
  }
  console.log(`maintenance: ${VEHICLES.length} véhicules, ${records} entretiens`);
}
