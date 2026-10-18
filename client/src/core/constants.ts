// Mirrors server/src/core/constants.ts.

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

export const CATEGORY_ICONS: Record<ServiceCategory, string> = {
  lavage: '🧽',
  vidange: '🛢️',
  pneus: '🛞',
  climatisation: '❄️',
  electricite: '🔋',
  carrosserie: '🚗',
  mecanique: '🔧',
  depannage: '🚨',
};

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

export const FUEL_TYPES = ['essence', 'diesel', 'hybride', 'electrique', 'gpl'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const FUEL_LABELS: Record<FuelType, string> = {
  essence: 'Essence',
  diesel: 'Diesel',
  hybride: 'Hybride',
  electrique: 'Électrique',
  gpl: 'GPL',
};

export const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function isServiceCategory(value: unknown): value is ServiceCategory {
  return typeof value === 'string' && (SERVICE_CATEGORIES as readonly string[]).includes(value);
}

export const formatTnd = (value: number) =>
  `${new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 3 }).format(value)} TND`;

export const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));

export const formatDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
