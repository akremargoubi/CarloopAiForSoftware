import type { SeedContext } from '../../core/types/feature.js';
import { mockEstimate } from './mock.js';
import { BookingModel, QuoteModel } from './model.js';
import type { VehicleInput } from './schema.js';

const VEHICLES: VehicleInput[] = [
  { marque: 'Peugeot', modele: '208', annee: 2019, kilometrage: 68000, carburant: 'essence' },
  { marque: 'Volkswagen', modele: 'Golf 7', annee: 2016, kilometrage: 142000, carburant: 'diesel' },
  { marque: 'Kia', modele: 'Picanto', annee: 2021, kilometrage: 31000, carburant: 'essence' },
];

/** Next weekday (Mon-Fri) at the given hour, Tunis time (UTC+1), `daysAhead` days from now. */
function nextWeekdayAt(daysAhead: number, hour: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(hour - 1, 0, 0, 0);
  return d;
}

/** Upcoming bookings for the pro agendas (completed bookings are created by the reviews seed). */
export async function seedQuotes({ clients, providers }: SeedContext): Promise<void> {
  // Providers owned by the demo pros (see core seed): indexes 0, 2, 5, 12, 14.
  const owned = [0, 2, 5, 12, 14].map((i) => providers[i]);
  let n = 0;
  for (const [i, provider] of owned.entries()) {
    for (const [j, status] of (['pending', 'accepted', 'pending'] as const).entries()) {
      const service = provider.services[(i + j) % provider.services.length];
      const vehicle = VEHICLES[(i + j) % VEHICLES.length];
      const client = clients[(i + j) % clients.length];
      const booking = await BookingModel.create({
        client: client._id,
        provider: provider._id,
        serviceId: service._id,
        category: service.category,
        serviceName: service.name,
        catalogPriceTnd: service.priceTnd,
        durationMin: service.durationMin,
        scheduledAt: nextWeekdayAt(1 + j * 2 + i, 9 + j * 2),
        vehicle,
        description: j === 0 ? 'Merci de vérifier aussi les niveaux.' : '',
        status,
        aiEstimate: mockEstimate({ vehicule: vehicle, categorie: service.category, description: '' }, service.priceTnd),
      });
      if (status === 'accepted') {
        await QuoteModel.create({
          booking: booking._id,
          provider: provider._id,
          items: [
            { label: service.name, amountTnd: service.priceTnd },
            { label: 'Main d’œuvre', amountTnd: 30 },
          ],
          totalTnd: service.priceTnd + 30,
          message: 'Devis établi selon votre description, à confirmer sur place.',
        });
      }
      n++;
    }
  }
  console.log(`quotes: ${n} réservations à venir`);
}
