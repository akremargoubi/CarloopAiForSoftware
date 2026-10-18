import bcrypt from 'bcryptjs';
import type { ServiceCategory } from '../constants.js';
import { ProviderModel, type ProviderDoc } from '../models/Provider.js';
import { UserModel, type UserDoc } from '../models/User.js';
import type { SeedContext } from '../types/feature.js';

/** Demo passwords, documented in README.md. */
export const DEMO_PASSWORDS = {
  admin: 'Admin123!',
  client: 'Client123!',
  pro: 'Pro12345!',
} as const;

/** Service catalogue: [name, base price in TND, duration in minutes]. */
const CATALOGUE: Record<ServiceCategory, [string, number, number][]> = {
  lavage: [
    ['Lavage extérieur', 15, 30],
    ['Lavage complet intérieur + extérieur', 35, 60],
    ['Nettoyage des sièges (shampoing)', 70, 120],
  ],
  vidange: [
    ['Vidange huile 10W40 + filtre à huile', 95, 45],
    ['Vidange huile synthétique 5W30 + filtres', 160, 60],
  ],
  pneus: [
    ['Montage + équilibrage (par pneu)', 12, 20],
    ['Pneu 195/65 R15 posé', 220, 30],
    ['Parallélisme', 40, 40],
  ],
  climatisation: [
    ['Recharge climatisation', 110, 60],
    ['Diagnostic et recherche de fuite clim', 60, 45],
  ],
  electricite: [
    ['Diagnostic électronique (valise)', 50, 30],
    ['Remplacement batterie (fournie)', 260, 30],
    ['Réparation alternateur / démarreur', 180, 120],
  ],
  carrosserie: [
    ['Débosselage sans peinture', 120, 90],
    ['Peinture élément (par pièce)', 250, 480],
    ['Polissage optiques', 45, 45],
  ],
  mecanique: [
    ['Remplacement plaquettes de frein (avant)', 140, 60],
    ['Kit de distribution', 650, 240],
    ['Embrayage complet', 900, 360],
  ],
  depannage: [
    ['Remorquage urbain', 70, 60],
    ['Dépannage sur place (batterie, roue)', 50, 45],
  ],
};

interface ProviderSeed {
  name: string;
  city: SeedCity;
  address: string;
  categories: ServiceCategory[];
  priceFactor: number;
  saturday: boolean;
  description: string;
}

type SeedCity = ProviderDoc['city'];

const PROVIDERS: ProviderSeed[] = [
  { name: 'Garage Ennour', city: 'Tunis', address: 'Avenue de la Liberté, Tunis', categories: ['vidange', 'mecanique', 'electricite'], priceFactor: 1, saturday: true, description: 'Garage de quartier, mécanique générale et entretien toutes marques.' },
  { name: 'Speed Wash Lafayette', city: 'Tunis', address: 'Rue de Palestine, Lafayette', categories: ['lavage'], priceFactor: 1.1, saturday: true, description: 'Station de lavage manuel et nettoyage intérieur.' },
  { name: 'Auto Clim Ariana', city: 'Ariana', address: 'Avenue Habib Bourguiba, Ariana', categories: ['climatisation', 'electricite'], priceFactor: 0.95, saturday: true, description: 'Spécialiste climatisation et électricité automobile.' },
  { name: 'Ariana Pneus Service', city: 'Ariana', address: 'Route de Raoued, Ariana', categories: ['pneus', 'vidange'], priceFactor: 0.85, saturday: true, description: 'Pneus toutes marques, vidange express sans rendez-vous.' },
  { name: 'Mécanique El Menzah', city: 'Ariana', address: 'El Menzah 6, Ariana', categories: ['mecanique', 'vidange', 'electricite'], priceFactor: 1.15, saturday: false, description: 'Atelier équipé pour la mécanique lourde et la distribution.' },
  { name: 'Carrosserie Ben Arous', city: 'Ben Arous', address: 'Zone industrielle, Ben Arous', categories: ['carrosserie', 'lavage'], priceFactor: 0.9, saturday: true, description: 'Tôlerie, peinture au four et polissage.' },
  { name: 'Dépannage Express Rades', city: 'Ben Arous', address: 'Radès, Ben Arous', categories: ['depannage', 'mecanique'], priceFactor: 1, saturday: true, description: 'Remorquage et dépannage 7j/7 dans le Grand Tunis.' },
  { name: 'Marsa Car Care', city: 'La Marsa', address: 'Marsa Plage, La Marsa', categories: ['lavage', 'carrosserie'], priceFactor: 1.35, saturday: true, description: 'Lavage premium et detailing.' },
  { name: 'Garage Manouba Auto', city: 'Manouba', address: 'Centre-ville, Manouba', categories: ['vidange', 'pneus', 'mecanique'], priceFactor: 0.8, saturday: true, description: 'Entretien à prix serrés.' },
  { name: 'Cap Bon Mécanique', city: 'Nabeul', address: 'Route de Hammamet, Nabeul', categories: ['mecanique', 'electricite', 'climatisation'], priceFactor: 0.9, saturday: false, description: 'Mécanique et électricité, véhicules essence et diesel.' },
  { name: 'Hammamet Auto Service', city: 'Hammamet', address: 'Zone touristique, Hammamet', categories: ['vidange', 'lavage', 'climatisation'], priceFactor: 1.05, saturday: true, description: 'Entretien rapide pour particuliers et loueurs.' },
  { name: 'Sahel Pneus', city: 'Sousse', address: 'Route de Tunis, Sousse', categories: ['pneus', 'depannage'], priceFactor: 0.9, saturday: true, description: 'Pneus neufs et occasion, dépannage sur route.' },
  { name: 'Sousse Diag Auto', city: 'Sousse', address: 'Khezama, Sousse', categories: ['electricite', 'mecanique', 'vidange'], priceFactor: 1, saturday: true, description: 'Diagnostic électronique multimarque.' },
  { name: 'Monastir Carrosserie Pro', city: 'Monastir', address: 'Skanes, Monastir', categories: ['carrosserie'], priceFactor: 0.95, saturday: false, description: 'Réparation après sinistre, agréé assurances.' },
  { name: 'Sfax Mécanique Lourde', city: 'Sfax', address: 'Route de Gremda, Sfax', categories: ['mecanique', 'depannage'], priceFactor: 0.85, saturday: true, description: 'Moteurs, boîtes de vitesses, embrayages.' },
  { name: 'Sfax Clim & Froid', city: 'Sfax', address: 'Route de Tunis km 4, Sfax', categories: ['climatisation', 'electricite'], priceFactor: 0.9, saturday: true, description: 'Climatisation auto et électricité.' },
  { name: 'Bizerte Lavage Auto', city: 'Bizerte', address: 'Corniche, Bizerte', categories: ['lavage', 'vidange'], priceFactor: 0.8, saturday: true, description: 'Lavage et vidange rapide.' },
  { name: 'Kairouan Auto Center', city: 'Kairouan', address: 'Route de Sousse, Kairouan', categories: ['vidange', 'pneus', 'mecanique', 'electricite'], priceFactor: 0.75, saturday: true, description: 'Centre auto polyvalent.' },
  { name: 'Gabès Dépannage Sud', city: 'Gabès', address: 'Route de Médenine, Gabès', categories: ['depannage', 'pneus'], priceFactor: 0.85, saturday: true, description: 'Dépannage et remorquage dans le sud tunisien.' },
];

const round = (n: number) => Math.round(n);

function buildServices(seed: ProviderSeed) {
  return seed.categories.flatMap((category) =>
    CATALOGUE[category].map(([name, price, durationMin]) => ({
      category,
      name,
      priceTnd: round(price * seed.priceFactor),
      durationMin,
    })),
  );
}

function buildHours(saturday: boolean) {
  const weekdays = [1, 2, 3, 4, 5].map((day) => ({ day, open: '08:00', close: '18:00' }));
  return saturday ? [...weekdays, { day: 6, open: '08:00', close: '13:00' }] : weekdays;
}

/** Creates the admin, demo clients, pros and providers. */
export async function seedCore(): Promise<SeedContext> {
  const [adminHash, clientHash, proHash] = await Promise.all([
    bcrypt.hash(DEMO_PASSWORDS.admin, 10),
    bcrypt.hash(DEMO_PASSWORDS.client, 10),
    bcrypt.hash(DEMO_PASSWORDS.pro, 10),
  ]);

  const admin = await UserModel.create({
    name: 'Admin CarLoop',
    email: 'admin@carloop.tn',
    passwordHash: adminHash,
    role: 'admin',
  });

  const clientNames = ['Sami Ben Ali', 'Mariem Trabelsi', 'Youssef Gharbi', 'Ines Jaziri', 'Karim Bouazizi'];
  const clients: UserDoc[] = await UserModel.create(
    clientNames.map((name, i) => ({
      name,
      email: `client${i + 1}@carloop.tn`,
      phone: `+216 2${i} 123 45${i}`,
      passwordHash: clientHash,
      role: 'client',
    })),
  );

  const proNames = ['Hatem Ennour', 'Nizar Hammami', 'Rania Khelifi', 'Mehdi Sassi', 'Olfa Mansour', 'Walid Chaabane'];
  const pros: UserDoc[] = await UserModel.create(
    proNames.map((name, i) => ({
      name,
      email: `pro${i + 1}@carloop.tn`,
      phone: `+216 9${i} 654 32${i}`,
      passwordHash: proHash,
      role: 'pro',
      // The last pro stays pending, to demonstrate account validation in the admin dashboard.
      proStatus: i === proNames.length - 1 ? 'pending' : 'approved',
    })),
  );

  // Owned providers: pro1 -> providers[0], pro2 -> [2], pro3 -> [5], pro4 -> [12], pro5 -> [14]
  const ownership = new Map<number, UserDoc>([
    [0, pros[0]],
    [2, pros[1]],
    [5, pros[2]],
    [12, pros[3]],
    [14, pros[4]],
  ]);

  const providers: ProviderDoc[] = [];
  for (const [index, seed] of PROVIDERS.entries()) {
    providers.push(
      await ProviderModel.create({
        name: seed.name,
        owner: ownership.get(index)?._id,
        description: seed.description,
        city: seed.city,
        address: seed.address,
        phone: `+216 7${index % 10} ${100 + index} ${200 + index}`,
        categories: seed.categories,
        services: buildServices(seed),
        openingHours: buildHours(seed.saturday),
        isActive: true,
      }),
    );
  }

  // Pending pro: inactive business until validated.
  await ProviderModel.create({
    name: 'Garage Chaabane (en attente)',
    owner: pros[5]._id,
    city: 'Nabeul',
    categories: ['vidange'],
    services: buildServices({ ...PROVIDERS[0], categories: ['vidange'] }),
    openingHours: buildHours(true),
    isActive: false,
  });

  return { admin, clients, pros, providers };
}
