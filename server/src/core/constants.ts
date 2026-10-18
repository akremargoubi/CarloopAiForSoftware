/** Service categories shared by every module (search, diagnostic, quotes, maintenance...). */
export const SERVICE_CATEGORIES = [
  'lavage',
  'vidange',
  'pneus',
  'climatisation',
  'electricite',
  'carrosserie',
  'mecanique',
  'depannage',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  lavage: 'Lavage',
  vidange: 'Vidange',
  pneus: 'Pneus',
  climatisation: 'Climatisation',
  electricite: 'Électricité',
  carrosserie: 'Carrosserie',
  mecanique: 'Mécanique lourde',
  depannage: 'Dépannage',
};

/** Tunisian cities covered by the seed data. */
export const CITIES = [
  'Tunis',
  'Ariana',
  'Ben Arous',
  'La Marsa',
  'Manouba',
  'Nabeul',
  'Hammamet',
  'Sousse',
  'Monastir',
  'Sfax',
  'Bizerte',
  'Kairouan',
  'Gabès',
] as const;

export const ROLES = ['client', 'pro', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const FUEL_TYPES = ['essence', 'diesel', 'hybride', 'electrique', 'gpl'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];
