import type { ServiceCategory } from '@prisma/client';

/** Données de démonstration 100 % FICTIVES (noms, adresses, téléphones, emails en .test). */

/** Professionnel de démo. */
export interface SeedPro {
  key: string;
  firstName: string;
  lastName: string;
  phone: string;
}

/** Garage de démo. */
export interface SeedGarage {
  key: string;
  ownerKey: string;
  name: string;
  city: string;
  address: string;
  description: string;
}

/** Service de démo. */
export interface SeedService {
  garageKey: string;
  category: ServiceCategory;
  title: string;
  description: string;
  price: number;
  durationMinutes: number;
}

/** 8 professionnels fictifs (emails pro1..pro8@carloop.test). */
export const SEED_PROS: readonly SeedPro[] = [
  { key: 'pro1', firstName: 'Karim', lastName: 'Ben Salah', phone: '+216 20 000 001' },
  { key: 'pro2', firstName: 'Leila', lastName: 'Trabelsi', phone: '+216 20 000 002' },
  { key: 'pro3', firstName: 'Mehdi', lastName: 'Jaziri', phone: '+216 20 000 003' },
  { key: 'pro4', firstName: 'Sonia', lastName: 'Gharbi', phone: '+216 20 000 004' },
  { key: 'pro5', firstName: 'Hatem', lastName: 'Ellouze', phone: '+216 20 000 005' },
  { key: 'pro6', firstName: 'Nadia', lastName: 'Mansouri', phone: '+216 20 000 006' },
  { key: 'pro7', firstName: 'Walid', lastName: 'Chaabane', phone: '+216 20 000 007' },
  { key: 'pro8', firstName: 'Rim', lastName: 'Haddad', phone: '+216 20 000 008' },
];

/** 4 clients fictifs (emails client1..client4@carloop.test). */
export const SEED_CLIENTS = [
  { key: 'client1', firstName: 'Youssef', lastName: 'Ayari', phone: '+216 50 000 001' },
  { key: 'client2', firstName: 'Amira', lastName: 'Bouzid', phone: '+216 50 000 002' },
  { key: 'client3', firstName: 'Omar', lastName: 'Kefi', phone: '+216 50 000 003' },
  { key: 'client4', firstName: 'Ines', lastName: 'Sassi', phone: '+216 50 000 004' },
] as const;

/** 13 garages fictifs répartis dans 10 villes tunisiennes. */
export const SEED_GARAGES: readonly SeedGarage[] = [
  {
    key: 'ennour',
    ownerKey: 'pro1',
    name: 'Garage Ennour',
    city: 'Tunis',
    address: '45 avenue de la Liberté, Lafayette',
    description: 'Garage généraliste toutes marques au centre de Tunis : mécanique, entretien, diagnostic et vitrage.',
  },
  {
    key: 'speedwash',
    ownerKey: 'pro2',
    name: 'Speed Wash Les Berges du Lac',
    city: 'Tunis',
    address: 'Rue du Lac Malaren, Les Berges du Lac',
    description: 'Centre de lavage et d’esthétique automobile, à la main et sans rendez-vous.',
  },
  {
    key: 'ariana',
    ownerKey: 'pro3',
    name: 'Ariana Auto Confort',
    city: 'Ariana',
    address: 'Avenue Habib Bourguiba, Ariana Ville',
    description: 'Spécialiste climatisation, chauffage et équipements électriques embarqués.',
  },
  {
    key: 'pneuexpress',
    ownerKey: 'pro3',
    name: 'Pneu Express Ben Arous',
    city: 'Ben Arous',
    address: 'Route de Mornag, zone industrielle',
    description: 'Centre pneumatique rapide : pneus, géométrie, vidange express.',
  },
  {
    key: 'sahel',
    ownerKey: 'pro4',
    name: 'Sahel Mécanique',
    city: 'Sousse',
    address: 'Boulevard du 14 Janvier, Sahloul',
    description: 'Atelier mécanique et entretien périodique, équipe certifiée multimarques.',
  },
  {
    key: 'kantaoui',
    ownerKey: 'pro4',
    name: 'Carrosserie El Kantaoui',
    city: 'Sousse',
    address: 'Route touristique, Hammam Sousse',
    description: 'Tôlerie, peinture en cabine et débosselage, travail soigné avec garantie.',
  },
  {
    key: 'sfaxelec',
    ownerKey: 'pro5',
    name: 'Sfax Auto Électric',
    city: 'Sfax',
    address: 'Route de Gremda km 2',
    description: 'Électricité et électronique automobile : batterie, alternateur, démarreur, climatisation.',
  },
  {
    key: 'depsud',
    ownerKey: 'pro5',
    name: 'Dépannage Sud 24/24',
    city: 'Sfax',
    address: 'Route de Gabès km 4',
    description: 'Dépannage et remorquage jour et nuit dans tout le gouvernorat de Sfax.',
  },
  {
    key: 'capbon',
    ownerKey: 'pro6',
    name: 'Cap Bon Garage',
    city: 'Nabeul',
    address: 'Avenue Habib Thameur',
    description: 'Garage de proximité : réparations courantes, pneus et assistance sur place.',
  },
  {
    key: 'bizerte',
    ownerKey: 'pro6',
    name: 'Bizerte Car Care',
    city: 'Bizerte',
    address: 'Rue de la Corniche',
    description: 'Entretien, nettoyage et petites réparations pour particuliers et flottes.',
  },
  {
    key: 'monastir',
    ownerKey: 'pro7',
    name: 'Monastir Auto Center',
    city: 'Monastir',
    address: 'Route de Skanès',
    description: 'Centre auto complet : entretien, boîte automatique, esthétique et éclairage.',
  },
  {
    key: 'gabes',
    ownerKey: 'pro8',
    name: 'Gabès Assistance Auto',
    city: 'Gabès',
    address: 'Avenue Farhat Hached',
    description: 'Assistance routière, pneus et entretien des véhicules diesel dans le sud.',
  },
  {
    key: 'kairouan',
    ownerKey: 'pro8',
    name: 'Garage El Kods',
    city: 'Kairouan',
    address: 'Route de Sousse',
    description: 'Mécanique lourde, embrayage, carrosserie et électricité.',
  },
];

/** 48 services fictifs : 6 par catégorie. */
export const SEED_SERVICES: readonly SeedService[] = [
  // --- LAVAGE ---
  {
    garageKey: 'speedwash',
    category: 'LAVAGE',
    title: 'Lavage extérieur express',
    description:
      'Prélavage haute pression, shampooing de la carrosserie, nettoyage des jantes, rinçage et séchage à la peau de chamois.',
    price: 15,
    durationMinutes: 20,
  },
  {
    garageKey: 'speedwash',
    category: 'LAVAGE',
    title: 'Nettoyage intérieur complet',
    description:
      'Aspiration des sièges, tapis et coffre, nettoyage des plastiques et du tableau de bord, vitres intérieures et désodorisation de l’habitacle.',
    price: 45,
    durationMinutes: 90,
  },
  {
    garageKey: 'bizerte',
    category: 'LAVAGE',
    title: 'Shampooing des sièges et moquettes',
    description:
      'Injection-extraction sur sièges en tissu et moquettes, élimination des taches et des odeurs de tabac ou d’animaux.',
    price: 60,
    durationMinutes: 120,
  },
  {
    garageKey: 'monastir',
    category: 'LAVAGE',
    title: 'Préparation esthétique avant revente',
    description:
      'Lavage intégral intérieur et extérieur, polissage, rénovation des plastiques et des optiques pour présenter un véhicule impeccable aux acheteurs.',
    price: 150,
    durationMinutes: 240,
  },
  {
    garageKey: 'capbon',
    category: 'LAVAGE',
    title: 'Lavage moteur à la vapeur',
    description:
      'Dégraissage du compartiment moteur à la vapeur sèche, protection des connecteurs électriques et finition des plastiques.',
    price: 25,
    durationMinutes: 30,
  },
  {
    garageKey: 'ennour',
    category: 'LAVAGE',
    title: 'Lustrage et cire de protection',
    description:
      'Polissage à la machine et application d’une cire carnauba qui protège la peinture du soleil et de l’air salin.',
    price: 80,
    durationMinutes: 120,
  },

  // --- VIDANGE ---
  {
    garageKey: 'ennour',
    category: 'VIDANGE',
    title: 'Vidange huile moteur et filtre',
    description:
      'Remplacement de l’huile moteur (5W30 ou 10W40 selon le constructeur) et du filtre à huile, contrôle de tous les niveaux.',
    price: 120,
    durationMinutes: 45,
  },
  {
    garageKey: 'sahel',
    category: 'VIDANGE',
    title: 'Révision complète constructeur',
    description:
      'Vidange, remplacement des filtres à air, habitacle et carburant, contrôle de 30 points de sécurité et remise à zéro de l’indicateur d’entretien.',
    price: 280,
    durationMinutes: 150,
  },
  {
    garageKey: 'monastir',
    category: 'VIDANGE',
    title: 'Vidange de boîte automatique',
    description:
      'Remplacement de l’huile ATF et du filtre de boîte automatique pour retrouver des passages de rapports souples, sans à-coups.',
    price: 350,
    durationMinutes: 120,
  },
  {
    garageKey: 'bizerte',
    category: 'VIDANGE',
    title: 'Remplacement du liquide de refroidissement',
    description:
      'Purge du circuit, remplissage en liquide antigel neuf et contrôle d’étanchéité pour éviter la surchauffe du moteur.',
    price: 90,
    durationMinutes: 60,
  },
  {
    garageKey: 'gabes',
    category: 'VIDANGE',
    title: 'Forfait entretien diesel',
    description:
      'Vidange, filtre à gasoil, purge de l’eau du circuit de carburant et contrôle des injecteurs pour les moteurs diesel.',
    price: 200,
    durationMinutes: 90,
  },
  {
    garageKey: 'pneuexpress',
    category: 'VIDANGE',
    title: 'Vidange express sans rendez-vous',
    description: 'Vidange rapide huile et filtre en 30 minutes, contrôle de la pression des pneus offert.',
    price: 95,
    durationMinutes: 30,
  },

  // --- PNEUS ---
  {
    garageKey: 'pneuexpress',
    category: 'PNEUS',
    title: 'Montage et équilibrage de pneus',
    description: 'Démontage, montage de pneus neufs ou d’occasion et équilibrage électronique des quatre roues.',
    price: 40,
    durationMinutes: 45,
  },
  {
    garageKey: 'pneuexpress',
    category: 'PNEUS',
    title: 'Géométrie et parallélisme',
    description:
      'Réglage du parallélisme au banc 3D pour une voiture qui tire d’un côté, un volant de travers ou une usure irrégulière des pneus.',
    price: 50,
    durationMinutes: 45,
  },
  {
    garageKey: 'capbon',
    category: 'PNEUS',
    title: 'Réparation de crevaison',
    description: 'Réparation du pneu crevé par mèche ou champignon, contrôle de la jante et regonflage.',
    price: 15,
    durationMinutes: 20,
  },
  {
    garageKey: 'sahel',
    category: 'PNEUS',
    title: 'Permutation des pneus',
    description: 'Inversion avant / arrière des roues pour répartir l’usure et prolonger la durée de vie des pneus.',
    price: 25,
    durationMinutes: 30,
  },
  {
    garageKey: 'gabes',
    category: 'PNEUS',
    title: 'Vente et pose de pneus neufs',
    description:
      'Large choix de marques et de dimensions, pose avec valve neuve et équilibrage inclus, recyclage des anciens pneus.',
    price: 220,
    durationMinutes: 60,
  },
  {
    garageKey: 'monastir',
    category: 'PNEUS',
    title: 'Gonflage à l’azote et contrôle de pression',
    description: 'Gonflage des pneus à l’azote pour une pression plus stable, contrôle de l’usure et de la roue de secours.',
    price: 20,
    durationMinutes: 15,
  },

  // --- CLIM ---
  {
    garageKey: 'ariana',
    category: 'CLIM',
    title: 'Recharge de climatisation',
    description:
      'Récupération et recharge du gaz réfrigérant R134a ou R1234yf, contrôle de la température de l’air soufflé.',
    price: 90,
    durationMinutes: 45,
  },
  {
    garageKey: 'ariana',
    category: 'CLIM',
    title: 'Recherche de fuite de climatisation',
    description: 'Détection de fuite par traceur UV ou azote lorsque la climatisation ne refroidit plus correctement.',
    price: 60,
    durationMinutes: 60,
  },
  {
    garageKey: 'speedwash',
    category: 'CLIM',
    title: 'Désinfection du circuit de climatisation',
    description:
      'Traitement antibactérien de l’évaporateur et remplacement du filtre d’habitacle contre les mauvaises odeurs à la mise en marche.',
    price: 50,
    durationMinutes: 30,
  },
  {
    garageKey: 'sfaxelec',
    category: 'CLIM',
    title: 'Remplacement du compresseur de climatisation',
    description: 'Dépose et remplacement du compresseur défectueux, tirage au vide et recharge complète du circuit.',
    price: 650,
    durationMinutes: 240,
  },
  {
    garageKey: 'sahel',
    category: 'CLIM',
    title: 'Entretien climatisation avant l’été',
    description: 'Contrôle complet, nettoyage du condenseur, recharge et test d’étanchéité avant les fortes chaleurs.',
    price: 110,
    durationMinutes: 60,
  },
  {
    garageKey: 'bizerte',
    category: 'CLIM',
    title: 'Réparation chauffage et ventilation',
    description:
      'Remplacement de la résistance de pulseur, du radiateur de chauffage ou du moteur de ventilation de l’habitacle.',
    price: 120,
    durationMinutes: 90,
  },

  // --- ELECTRICITE ---
  {
    garageKey: 'sfaxelec',
    category: 'ELECTRICITE',
    title: 'Test et remplacement de batterie',
    description: 'Contrôle de la batterie et du circuit de charge, remplacement par une batterie neuve si nécessaire.',
    price: 35,
    durationMinutes: 30,
  },
  {
    garageKey: 'sfaxelec',
    category: 'ELECTRICITE',
    title: 'Réparation alternateur et démarreur',
    description:
      'Diagnostic et réparation de l’alternateur ou du démarreur lorsque le moteur ne se lance pas ou que le voyant de charge reste allumé.',
    price: 180,
    durationMinutes: 120,
  },
  {
    garageKey: 'ennour',
    category: 'ELECTRICITE',
    title: 'Diagnostic électronique par valise OBD',
    description:
      'Lecture des codes défaut et analyse des voyants du tableau de bord (moteur, ABS, airbag), effacement après réparation.',
    price: 50,
    durationMinutes: 30,
  },
  {
    garageKey: 'monastir',
    category: 'ELECTRICITE',
    title: 'Réparation éclairage et feux',
    description: 'Remplacement d’ampoules, réglage des phares, réparation des feux arrière, stop et clignotants.',
    price: 40,
    durationMinutes: 45,
  },
  {
    garageKey: 'ariana',
    category: 'ELECTRICITE',
    title: 'Installation autoradio et caméra de recul',
    description: 'Pose d’autoradio multimédia, caméra et radar de recul, intégration propre au faisceau d’origine.',
    price: 80,
    durationMinutes: 90,
  },
  {
    garageKey: 'kairouan',
    category: 'ELECTRICITE',
    title: 'Réparation vitres électriques et fermeture centralisée',
    description: 'Remplacement de lève-vitre ou de moteur de vitre, réparation de la fermeture centralisée et des télécommandes.',
    price: 110,
    durationMinutes: 90,
  },

  // --- CARROSSERIE ---
  {
    garageKey: 'kantaoui',
    category: 'CARROSSERIE',
    title: 'Débosselage sans peinture',
    description: 'Réparation des petits chocs, bosses de parking et impacts de grêle sans repeindre la carrosserie.',
    price: 120,
    durationMinutes: 120,
  },
  {
    garageKey: 'kantaoui',
    category: 'CARROSSERIE',
    title: 'Peinture d’un élément de carrosserie',
    description: 'Préparation, apprêt et peinture en cabine d’une aile, d’une portière ou d’un capot à la teinte d’origine.',
    price: 300,
    durationMinutes: 480,
  },
  {
    garageKey: 'kairouan',
    category: 'CARROSSERIE',
    title: 'Réparation de pare-chocs',
    description: 'Réparation des pare-chocs fissurés ou arrachés, soudure plastique, remise en forme et peinture.',
    price: 150,
    durationMinutes: 180,
  },
  {
    garageKey: 'ennour',
    category: 'CARROSSERIE',
    title: 'Remplacement de pare-brise',
    description: 'Remplacement du pare-brise fissuré ou impacté, prise en charge par l’assurance possible.',
    price: 450,
    durationMinutes: 120,
  },
  {
    garageKey: 'monastir',
    category: 'CARROSSERIE',
    title: 'Rénovation des optiques jaunies',
    description: 'Ponçage et vernissage des blocs optiques ternis par le soleil pour retrouver leur transparence.',
    price: 60,
    durationMinutes: 60,
  },
  {
    garageKey: 'kantaoui',
    category: 'CARROSSERIE',
    title: 'Traitement des rayures et retouches peinture',
    description: 'Polissage des rayures superficielles et retouches sur les éclats de gravillons.',
    price: 90,
    durationMinutes: 90,
  },

  // --- MECANIQUE ---
  {
    garageKey: 'sahel',
    category: 'MECANIQUE',
    title: 'Remplacement plaquettes et disques de frein',
    description: 'Remplacement des plaquettes et des disques avant ou arrière, purge du liquide de frein et essai routier.',
    price: 180,
    durationMinutes: 90,
  },
  {
    garageKey: 'ennour',
    category: 'MECANIQUE',
    title: 'Remplacement du kit de distribution',
    description: 'Remplacement de la courroie de distribution, des galets et de la pompe à eau selon la préconisation constructeur.',
    price: 550,
    durationMinutes: 300,
  },
  {
    garageKey: 'kairouan',
    category: 'MECANIQUE',
    title: 'Remplacement d’embrayage',
    description: 'Remplacement du kit embrayage (disque, mécanisme, butée) quand l’embrayage patine ou que les vitesses accrochent.',
    price: 700,
    durationMinutes: 360,
  },
  {
    garageKey: 'gabes',
    category: 'MECANIQUE',
    title: 'Amortisseurs et suspension',
    description: 'Remplacement des amortisseurs, coupelles et silentblocs ; diagnostic des claquements sur route dégradée.',
    price: 400,
    durationMinutes: 180,
  },
  {
    garageKey: 'capbon',
    category: 'MECANIQUE',
    title: 'Diagnostic bruit moteur et fuite d’huile',
    description: 'Recherche de l’origine d’un bruit anormal, d’une fumée à l’échappement ou d’une fuite d’huile, avec devis détaillé.',
    price: 60,
    durationMinutes: 60,
  },
  {
    garageKey: 'bizerte',
    category: 'MECANIQUE',
    title: 'Réparation de l’échappement',
    description: 'Remplacement du silencieux, du catalyseur ou du joint d’échappement en cas de bruit fort ou de fuite.',
    price: 250,
    durationMinutes: 120,
  },

  // --- DEPANNAGE ---
  {
    garageKey: 'depsud',
    category: 'DEPANNAGE',
    title: 'Remorquage 24h/24',
    description:
      'Intervention rapide sur route et autoroute, remorquage du véhicule en panne ou accidenté vers le garage de votre choix.',
    price: 80,
    durationMinutes: 60,
  },
  {
    garageKey: 'depsud',
    category: 'DEPANNAGE',
    title: 'Démarrage batterie à domicile',
    description: 'Démarrage avec booster ou remplacement de la batterie sur place, à domicile ou sur votre lieu de travail.',
    price: 50,
    durationMinutes: 30,
  },
  {
    garageKey: 'gabes',
    category: 'DEPANNAGE',
    title: 'Assistance routière autoroute A1',
    description: 'Remorquage et assistance sur l’autoroute A1 Tunis – Sfax – Gabès, plateau pour véhicules légers et SUV.',
    price: 120,
    durationMinutes: 90,
  },
  {
    garageKey: 'ennour',
    category: 'DEPANNAGE',
    title: 'Ouverture de véhicule, clés enfermées',
    description: 'Ouverture sans dégâts de votre voiture lorsque les clés sont restées à l’intérieur.',
    price: 60,
    durationMinutes: 30,
  },
  {
    garageKey: 'pneuexpress',
    category: 'DEPANNAGE',
    title: 'Livraison de carburant en panne sèche',
    description: 'Livraison d’essence ou de gasoil sur place lorsque vous êtes tombé en panne de carburant.',
    price: 40,
    durationMinutes: 45,
  },
  {
    garageKey: 'capbon',
    category: 'DEPANNAGE',
    title: 'Changement de roue sur place',
    description: 'Intervention pour changer une roue crevée au bord de la route ou à domicile.',
    price: 35,
    durationMinutes: 30,
  },
];
