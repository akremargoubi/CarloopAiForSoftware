import type { Pool } from 'pg';
import { SCHEMA_SQL } from './schema.js';

const CATEGORIES = [
  { slug: 'lavage', nom: 'Lavage', icone: 'water_drop' },
  { slug: 'vidange', nom: 'Vidange', icone: 'oil_barrel' },
  { slug: 'pneumatiques', nom: 'Pneumatiques', icone: 'tire_repair' },
  { slug: 'climatisation', nom: 'Climatisation', icone: 'ac_unit' },
  { slug: 'electricite', nom: 'Électricité', icone: 'bolt' },
  { slug: 'carrosserie', nom: 'Carrosserie', icone: 'directions_car' },
  { slug: 'mecanique-lourde', nom: 'Mécanique lourde', icone: 'build' },
  { slug: 'depannage', nom: 'Dépannage', icone: 'local_shipping' },
];

const USERS = [
  { nom: 'Client Démo', email: 'demo@carloop.tn' }, // id 1 = the stubbed logged-in client
  { nom: 'Sami B.', email: 'sami@example.com' },
  { nom: 'Ines K.', email: 'ines@example.com' },
  { nom: 'Mehdi T.', email: 'mehdi@example.com' },
  { nom: 'Rania M.', email: 'rania@example.com' },
];

const WEEK = { 'Lun - Ven': '08:00 - 18:00', Samedi: '08:00 - 13:00', Dimanche: 'Fermé' };
const WEEK_LONG = { 'Lun - Sam': '07:00 - 20:00', Dimanche: '09:00 - 14:00' };
const ALWAYS = { 'Tous les jours': '24h/24' };

type Presta = [category: string, nom: string, description: string, prix: number, minutes: number];

const PROVIDERS: {
  nom: string;
  adresse: string;
  lat: number;
  lng: number;
  horaires: Record<string, string>;
  description: string;
  disponible: boolean;
  valide: boolean;
  prestations: Presta[];
}[] = [
  {
    nom: 'Garage El Mechtel',
    adresse: 'Rue du Lac Biwa, Les Berges du Lac, Tunis',
    lat: 36.833,
    lng: 10.233,
    horaires: WEEK,
    description: 'Garage généraliste : entretien courant, diagnostic électronique et climatisation.',
    disponible: true,
    valide: true,
    prestations: [
      ['vidange', 'Vidange + filtre à huile', 'Huile 5W30 incluse, filtre à huile neuf.', 85, 45],
      ['electricite', 'Diagnostic électronique', 'Lecture des codes défauts et rapport.', 60, 40],
      ['climatisation', 'Recharge de climatisation', 'Gaz R134a, contrôle des fuites.', 120, 60],
    ],
  },
  {
    nom: 'Auto Wash Carthage',
    adresse: 'Avenue Habib Bourguiba, Carthage',
    lat: 36.8528,
    lng: 10.3233,
    horaires: WEEK_LONG,
    description: 'Station de lavage manuelle, intérieur et extérieur.',
    disponible: true,
    valide: true,
    prestations: [
      ['lavage', 'Lavage extérieur', 'Carrosserie, jantes et vitres.', 15, 25],
      ['lavage', 'Lavage complet', 'Intérieur + extérieur, aspiration.', 30, 60],
    ],
  },
  {
    nom: 'Pneu Express La Marsa',
    adresse: 'Route de la Marsa, La Marsa',
    lat: 36.8782,
    lng: 10.3247,
    horaires: WEEK,
    description: 'Spécialiste pneumatiques : montage, équilibrage, géométrie.',
    disponible: false,
    valide: true,
    prestations: [
      ['pneumatiques', 'Montage + équilibrage (4 roues)', 'Pneus fournis par le client.', 70, 50],
      ['pneumatiques', 'Géométrie / parallélisme', 'Réglage sur banc.', 55, 40],
      ['vidange', 'Vidange express', 'Huile minérale 10W40.', 65, 30],
    ],
  },
  {
    nom: 'Carrosserie Ben Arous',
    adresse: 'Zone industrielle, Ben Arous',
    lat: 36.7531,
    lng: 10.2189,
    horaires: WEEK,
    description: 'Réparation de carrosserie et peinture au four.',
    disponible: true,
    valide: true,
    prestations: [
      ['carrosserie', 'Débosselage sans peinture', 'Petits impacts, grêle.', 90, 90],
      ['carrosserie', 'Peinture d’un élément', 'Pare-chocs, aile ou porte.', 250, 240],
    ],
  },
  {
    nom: 'Dépannage 24/7 Tunis',
    adresse: 'Centre-ville, Tunis',
    lat: 36.8065,
    lng: 10.1815,
    horaires: ALWAYS,
    description: 'Remorquage et assistance routière dans le Grand Tunis.',
    disponible: true,
    valide: true,
    prestations: [
      ['depannage', 'Remorquage (jusqu’à 20 km)', 'Prise en charge sous 30 minutes.', 80, 30],
      ['depannage', 'Dépannage batterie / démarrage', 'Intervention sur place.', 45, 20],
    ],
  },
  {
    nom: 'Clim Auto Ariana',
    adresse: 'Rue Farhat Hached, Ariana',
    lat: 36.8665,
    lng: 10.1647,
    horaires: WEEK,
    description: 'Climatisation et électricité automobile.',
    disponible: true,
    valide: true,
    prestations: [
      ['climatisation', 'Recharge de climatisation', 'Gaz R134a.', 110, 60],
      ['climatisation', 'Désinfection circuit d’air', 'Traitement antibactérien.', 40, 30],
      ['electricite', 'Remplacement batterie', 'Batterie 60Ah, pose incluse.', 160, 30],
    ],
  },
  {
    nom: 'Méca Lourd Mégrine',
    adresse: 'Route de Radès, Mégrine',
    lat: 36.77,
    lng: 10.233,
    horaires: WEEK,
    description: 'Moteur, boîte de vitesses, embrayage et freinage.',
    disponible: true,
    valide: true,
    prestations: [
      ['mecanique-lourde', 'Remplacement embrayage', 'Kit embrayage + main d’œuvre.', 450, 300],
      ['mecanique-lourde', 'Plaquettes de frein (essieu)', 'Plaquettes neuves + contrôle disques.', 95, 60],
      ['vidange', 'Vidange + filtres', 'Huile, filtre à huile et à air.', 110, 60],
    ],
  },
  {
    nom: 'Lavage Premium Manouba',
    adresse: 'Avenue de l’Indépendance, La Manouba',
    lat: 36.81,
    lng: 10.0863,
    horaires: WEEK_LONG,
    description: 'Lavage soigné et rénovation des phares.',
    disponible: true,
    valide: true,
    prestations: [
      ['lavage', 'Lavage complet', 'Intérieur + extérieur.', 25, 55],
      ['lavage', 'Polissage carrosserie', 'Lustrage et cire protectrice.', 120, 150],
    ],
  },
  {
    nom: 'Garage Nouveau Atelier (en attente)',
    adresse: 'Sousse',
    lat: 35.8256,
    lng: 10.6369,
    horaires: WEEK,
    description: 'Compte professionnel en attente de validation par l’administrateur.',
    disponible: true,
    valide: false,
    prestations: [['vidange', 'Vidange', 'Huile incluse.', 70, 40]],
  },
];

// [provider name, user index, note, commentaire]
const REVIEWS: [string, number, number, string][] = [
  ['Garage El Mechtel', 1, 5, 'Travail propre et rapide, le prix annoncé était le prix payé.'],
  ['Garage El Mechtel', 2, 4, 'Bon diagnostic, un peu d’attente à l’accueil.'],
  ['Garage El Mechtel', 3, 5, 'Très professionnels, ils ont expliqué la panne clairement.'],
  ['Garage El Mechtel', 4, 3, 'Correct mais la voiture est sortie avec 1 h de retard.'],
  ['Auto Wash Carthage', 1, 5, 'Voiture impeccable, intérieur nickel pour 30 TND.'],
  ['Auto Wash Carthage', 2, 4, 'Très bon lavage, il y a du monde le samedi.'],
  ['Pneu Express La Marsa', 3, 4, 'Montage rapide, équilibrage parfait.'],
  ['Pneu Express La Marsa', 4, 2, 'Fermé quand je suis venu malgré l’horaire affiché.'],
  ['Carrosserie Ben Arous', 1, 5, 'Pare-chocs repeint, la teinte est identique à l’origine.'],
  ['Carrosserie Ben Arous', 2, 4, 'Résultat très bien, délai plus long que prévu.'],
  ['Dépannage 24/7 Tunis', 3, 5, 'Arrivés en 20 minutes en pleine nuit, très aimables.'],
  ['Dépannage 24/7 Tunis', 4, 4, 'Efficace, tarif conforme à l’annonce.'],
  ['Clim Auto Ariana', 1, 4, 'La clim refroidit à nouveau, merci.'],
  ['Méca Lourd Mégrine', 2, 5, 'Embrayage changé en une journée, aucun souci depuis.'],
  ['Lavage Premium Manouba', 3, 3, 'Lavage correct, polissage un peu cher.'],
];

/** Creates the schema (idempotent) and inserts demo data when the DB is empty. */
export async function setupDatabase(pool: Pool): Promise<{ seeded: boolean }> {
  await pool.query(SCHEMA_SQL);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM categories');
  if (rows[0].n > 0) return { seeded: false };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const categoryIds = new Map<string, number>();
    for (const c of CATEGORIES) {
      const r = await client.query(
        'INSERT INTO categories (slug, nom, icone) VALUES ($1,$2,$3) RETURNING id',
        [c.slug, c.nom, c.icone],
      );
      categoryIds.set(c.slug, r.rows[0].id);
    }

    const userIds: number[] = [];
    for (const u of USERS) {
      const r = await client.query(
        'INSERT INTO users (nom, email) VALUES ($1,$2) RETURNING id',
        [u.nom, u.email],
      );
      userIds.push(r.rows[0].id);
    }

    const providerIds = new Map<string, number>();
    for (const [i, p] of PROVIDERS.entries()) {
      const r = await client.query(
        `INSERT INTO providers
           (nom_atelier, adresse, latitude, longitude, horaires, description, photo_url, est_valide, est_disponible)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [
          p.nom,
          p.adresse,
          p.lat,
          p.lng,
          JSON.stringify(p.horaires),
          p.description,
          `https://picsum.photos/seed/carloop-${i + 1}/800/450`,
          p.valide,
          p.disponible,
        ],
      );
      providerIds.set(p.nom, r.rows[0].id);
      for (const [cat, nom, description, prix, duree] of p.prestations) {
        await client.query(
          `INSERT INTO prestations (provider_id, category_id, nom, description, prix, duree_estimee)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [r.rows[0].id, categoryIds.get(cat), nom, description, prix, duree],
        );
      }
    }

    for (const [provider, userIdx, note, commentaire] of REVIEWS) {
      await client.query(
        'INSERT INTO reviews (provider_id, user_id, note, commentaire) VALUES ($1,$2,$3,$4)',
        [providerIds.get(provider), userIds[userIdx], note, commentaire],
      );
    }

    await client.query('COMMIT');
    return { seeded: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
