export interface Category {
  id: number;
  slug: string;
  nom: string;
  icone: string;
}

export interface ProviderSummary {
  id: number;
  nom_atelier: string;
  adresse: string;
  latitude: number;
  longitude: number;
  horaires: Record<string, string>;
  photo_url: string | null;
  est_disponible: boolean;
  prix_depart: number;
  note_moyenne: number;
  nb_avis: number;
  distance_km: number;
  est_favori: boolean;
}

export interface Prestation {
  id: number;
  nom: string;
  description: string;
  prix: number;
  duree_estimee: number;
  category_slug: string;
  category_nom: string;
}

export interface ProviderDetail extends Omit<ProviderSummary, 'prix_depart'> {
  description: string;
  prestations: Prestation[];
}

export interface Review {
  id: number;
  note: number;
  commentaire: string;
  created_at: string;
  auteur: string;
}

export interface ReviewSummary {
  resume: string;
  points_forts: string[];
  points_faibles: string[];
  mots_cles: string[];
  nb_avis: number;
  cached: boolean;
}

export interface AssistantResult {
  category_slug: string | null;
  category_nom: string | null;
  mots_cles: string[];
  urgence: 'faible' | 'moyenne' | 'haute';
  explication: string;
}

export type Sort = 'distance' | 'price' | 'rating';
