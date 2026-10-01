import type { ServiceCategory } from '@prisma/client';

/**
 * Contrat du module de diagnostic IA — implémentation : Akrem.
 *
 * Règles (voir CLAUDE.md) :
 * - Appel LLM via OpenRouter (`OPENROUTER_API_KEY`, `OPENROUTER_MODELS` : le premier modèle
 *   est principal, les suivants servent de secours en cas d'erreur / quota).
 * - N'envoyer au LLM QUE `symptom` et `vehicle` : jamais de nom, email, téléphone ou id.
 * - Valider la réponse du LLM avec Zod avant de la renvoyer ou de l'enregistrer (table Diagnostic).
 * - La route applique déjà `aiLimiter` (quota OpenRouter limité).
 * - `recommendedCategories` permet au front de proposer des services via /api/services/search.
 */

/** Informations optionnelles sur le véhicule. */
export interface VehicleInfo {
  brand?: string;
  model?: string;
  year?: number;
  mileageKm?: number;
  fuel?: 'ESSENCE' | 'DIESEL' | 'HYBRIDE' | 'ELECTRIQUE' | 'GPL';
}

/** Entrée du diagnostic (body de POST /api/ai/diagnose, validé par `diagnoseSchema`). */
export interface DiagnoseInput {
  /** Description libre du problème par le client (10 à 1000 caractères). */
  symptom: string;
  vehicle?: VehicleInfo;
}

/** Niveau de confiance ou d'urgence. */
export type Level = 'LOW' | 'MEDIUM' | 'HIGH';

/** Cause probable identifiée par le LLM. */
export interface ProbableCause {
  label: string;
  explanation: string;
  confidence: Level;
}

/** Résultat du diagnostic (réponse de l'API et contenu de `Diagnostic.result`). */
export interface DiagnoseResult {
  /** Identifiant de la ligne Diagnostic enregistrée. */
  id: string;
  probableCauses: ProbableCause[];
  /** Catégories de services à proposer au client. */
  recommendedCategories: ServiceCategory[];
  /** Urgence : CRITICAL = ne pas rouler (freins, direction, surchauffe…). */
  urgency: Level | 'CRITICAL';
  /** Conseils immédiats pour le client. */
  advice: string;
  /** Rappel que le diagnostic IA ne remplace pas un professionnel. */
  disclaimer: string;
  /** Modèle OpenRouter ayant effectivement répondu. */
  model: string;
  createdAt: Date;
}

/** Service de diagnostic à implémenter. */
export interface DiagnosticService {
  /**
   * Produit un diagnostic à partir d'un symptôme et l'enregistre pour le client.
   * @param clientId Utilisateur courant (stockage uniquement, jamais envoyé au LLM).
   * @param input Symptôme et véhicule validés.
   */
  diagnose(clientId: string, input: DiagnoseInput): Promise<DiagnoseResult>;
}
