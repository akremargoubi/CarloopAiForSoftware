import type { ServiceCategory } from '@prisma/client';

/** Libellés français des catégories, utilisés dans le texte encodé par le modèle. */
export const CATEGORY_LABELS: Readonly<Record<ServiceCategory, string>> = {
  LAVAGE: 'Lavage et nettoyage',
  VIDANGE: 'Vidange et entretien',
  PNEUS: 'Pneus et roues',
  CLIM: 'Climatisation',
  ELECTRICITE: 'Électricité automobile',
  CARROSSERIE: 'Carrosserie et peinture',
  MECANIQUE: 'Mécanique',
  DEPANNAGE: 'Dépannage et remorquage',
};
