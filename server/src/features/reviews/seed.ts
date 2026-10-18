import mongoose, { Types } from 'mongoose';
import type { SeedContext } from '../../core/types/feature.js';
import { ReviewModel } from './model.js';
import { refreshProviderRating } from './service.js';

/** [provider index, rating, comment, pro reply?] — positive, negative and mixed reviews. */
const REVIEWS: [number, number, string, string?][] = [
  [0, 5, 'Accueil très aimable, vidange faite rapidement et prix correct. Je recommande.', 'Merci pour votre confiance, à bientôt au garage !'],
  [0, 4, 'Travail sérieux, ils m’ont bien expliqué le problème de freins avant d’intervenir.'],
  [0, 5, 'Garage honnête, prix raisonnable et voiture rendue propre.'],
  [0, 3, 'Bon travail mais une heure d’attente alors que j’avais rendez-vous.', 'Toutes nos excuses pour l’attente, nous revoyons notre planning du matin.'],
  [1, 5, 'Lavage impeccable, intérieur comme neuf. Personnel souriant.'],
  [1, 4, 'Rapide et efficace, un peu cher pour un simple lavage extérieur.'],
  [1, 2, 'Traces encore visibles sur la carrosserie après le lavage, déçu.'],
  [2, 5, 'Recharge de clim faite en 45 minutes, l’air est à nouveau bien froid. Très professionnel.'],
  [2, 5, 'Ils ont trouvé la fuite de clim que deux autres garages n’avaient pas vue. Compétents.'],
  [2, 4, 'Bon diagnostic électrique, prix annoncé respecté.'],
  [3, 4, 'Pneus montés rapidement, bon prix. Parking difficile devant le garage.'],
  [3, 2, 'Équilibrage mal fait, le volant vibre toujours, j’ai dû revenir.'],
  [3, 3, 'Service correct mais facture plus élevée que prévu à cause de valves non annoncées.'],
  [4, 5, 'Mécanique lourde de qualité, kit de distribution changé dans les délais. Garage sérieux.'],
  [4, 4, 'Compétents et transparents sur les pièces changées. Délai un peu long.'],
  [5, 5, 'Carrosserie refaite après un choc, travail soigné, on ne voit plus rien.', 'Merci beaucoup, ravis que le résultat vous plaise !'],
  [5, 3, 'Résultat correct mais délai annoncé de 2 jours, voiture rendue au bout de 5 jours.'],
  [5, 2, 'Peinture légèrement différente de la couleur d’origine, pas satisfait du résultat.'],
  [6, 5, 'Dépanneur arrivé en 30 minutes sur l’autoroute, très rassurant. Merci !'],
  [6, 4, 'Remorquage efficace, prix correct pour un dimanche soir.'],
  [7, 5, 'Detailing premium, la voiture brille. Cher mais ça vaut le coup.'],
  [7, 4, 'Très bon lavage, accueil courtois, un peu cher.'],
  [8, 2, 'Vidange faite mais filtre à huile pas changé alors qu’il était facturé. Pas honnête.'],
  [8, 1, 'Mal accueilli, attente de 2 heures et problème de batterie pas réglé.'],
  [8, 3, 'Prix pas cher, mais il faut vérifier le travail derrière eux.'],
  [11, 5, 'Pneus de bonne qualité à prix raisonnable, montage rapide.'],
  [11, 4, 'Accueil sympa et conseils utiles sur la pression des pneus.'],
  [12, 5, 'Diagnostic électronique précis, le voyant moteur est enfin éteint. Très compétent.', 'Merci pour votre retour, bonne route !'],
  [12, 4, 'Bon diagnostic, explications claires sur le capteur à changer.'],
  [12, 2, 'Diagnostic payé mais le problème persiste, il a fallu revenir deux fois.'],
  [14, 4, 'Embrayage changé correctement, garage sérieux.'],
  [14, 5, 'Excellent travail sur le moteur, prix honnête par rapport à Tunis.'],
];

/** ~30 reviews; their completed bookings are inserted in the shared "bookings" collection. */
export async function seedReviews({ clients, providers }: SeedContext): Promise<void> {
  const bookings = mongoose.connection.collection('bookings');
  const now = Date.now();
  for (const [i, [providerIndex, rating, comment, reply]] of REVIEWS.entries()) {
    const provider = providers[providerIndex];
    const service = provider.services[i % provider.services.length];
    const client = clients[i % clients.length];
    const date = new Date(now - (i + 3) * 4 * 24 * 3600 * 1000);
    date.setUTCHours(9, 0, 0, 0);
    const bookingId = new Types.ObjectId();
    await bookings.insertOne({
      _id: bookingId,
      client: client._id,
      provider: provider._id,
      serviceId: service._id,
      category: service.category,
      serviceName: service.name,
      catalogPriceTnd: service.priceTnd,
      durationMin: service.durationMin,
      scheduledAt: date,
      vehicle: { marque: 'Renault', modele: 'Clio', annee: 2017, kilometrage: 95000, carburant: 'essence' },
      description: '',
      status: 'completed',
      createdAt: date,
      updatedAt: date,
    });
    await ReviewModel.create({
      booking: bookingId,
      provider: provider._id,
      client: client._id,
      rating,
      comment,
      serviceName: service.name,
      createdAt: new Date(date.getTime() + 6 * 3600 * 1000),
      ...(reply ? { proReply: { text: reply, repliedAt: new Date(date.getTime() + 30 * 3600 * 1000) } } : {}),
    });
  }

  // One completed booking per demo client without review, to try the review form.
  for (const [i, client] of clients.slice(0, 2).entries()) {
    const provider = providers[[0, 2][i]];
    const service = provider.services[0];
    const date = new Date(now - (2 + i) * 24 * 3600 * 1000);
    await bookings.insertOne({
      client: client._id,
      provider: provider._id,
      serviceId: service._id,
      category: service.category,
      serviceName: service.name,
      catalogPriceTnd: service.priceTnd,
      durationMin: service.durationMin,
      scheduledAt: date,
      vehicle: { marque: 'Peugeot', modele: '208', annee: 2019, kilometrage: 68000, carburant: 'essence' },
      description: '',
      status: 'completed',
      createdAt: date,
      updatedAt: date,
    });
  }

  for (const id of new Set(REVIEWS.map(([p]) => p))) await refreshProviderRating(providers[id]._id);
  console.log(`reviews: ${REVIEWS.length} avis`);
}
