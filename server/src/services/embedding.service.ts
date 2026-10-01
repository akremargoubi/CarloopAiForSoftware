import { resolve } from 'node:path';
import type { FeatureExtractionPipeline } from '@huggingface/transformers';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { withTimeout } from '../utils/timeout';

/** État du modèle d'embeddings. */
export type EmbeddingStatus = 'disabled' | 'idle' | 'loading' | 'ready' | 'failed';

/** Précision des poids ONNX. */
export type EmbeddingDtype = 'fp32' | 'fp16' | 'q8' | 'q4';

/** Configuration du service d'embeddings. */
export interface EmbeddingOptions {
  enabled: boolean;
  model: string;
  dtype: EmbeddingDtype;
  cacheDir: string;
  timeoutMs: number;
  /** Préfixe ajouté aux requêtes (ex. "query: " pour les modèles E5). */
  queryPrefix: string;
  /** Préfixe ajouté aux documents indexés (ex. "passage: " pour les modèles E5). */
  passagePrefix: string;
}

/** Nature du texte encodé : requête utilisateur ou document (service) indexé. */
export type EmbeddingKind = 'query' | 'passage';

/** Erreur levée quand le modèle n'est pas chargé (désactivé, en chargement ou en échec). */
export class EmbeddingUnavailableError extends Error {
  /** @param status État courant du modèle. */
  constructor(status: EmbeddingStatus) {
    super(`Modèle d'embeddings indisponible (état : ${status})`);
    this.name = 'EmbeddingUnavailableError';
  }
}

/**
 * Service d'embeddings local (transformers.js / ONNX Runtime).
 * Le modèle est chargé une seule fois (singleton) ; les vecteurs sont obtenus par
 * mean pooling puis normalisés L2, de sorte que cosinus = produit scalaire.
 */
export class EmbeddingService {
  private extractor: FeatureExtractionPipeline | null = null;
  private loading: Promise<EmbeddingStatus> | null = null;
  private status: EmbeddingStatus;

  /** @param options Modèle, précision, dossier de cache et timeout. */
  constructor(private readonly options: EmbeddingOptions) {
    this.status = options.enabled ? 'idle' : 'disabled';
  }

  /**
   * Charge le modèle (idempotent : un seul chargement même si appelé plusieurs fois).
   * Ne lève jamais : en cas d'échec l'état passe à `failed` et la recherche bascule en mots-clés.
   * @returns L'état final du modèle.
   */
  init(): Promise<EmbeddingStatus> {
    if (!this.options.enabled) {
      return Promise.resolve(this.status);
    }
    this.loading ??= this.load();
    return this.loading;
  }

  /** Charge effectivement le pipeline de feature extraction. */
  private async load(): Promise<EmbeddingStatus> {
    this.status = 'loading';
    const startedAt = Date.now();
    try {
      const transformers = await import('@huggingface/transformers');
      transformers.env.cacheDir = resolve(this.options.cacheDir);
      this.extractor = await transformers.pipeline('feature-extraction', this.options.model, {
        dtype: this.options.dtype,
      });
      this.status = 'ready';
      logger.info(`Modèle ${this.options.model} chargé en ${Date.now() - startedAt} ms`);
    } catch (error: unknown) {
      this.status = 'failed';
      logger.error(`Échec du chargement du modèle ${this.options.model}`, error);
    }
    return this.status;
  }

  /** @returns L'état courant du modèle. */
  getStatus(): EmbeddingStatus {
    return this.status;
  }

  /** @returns `true` si le modèle est chargé et utilisable. */
  isReady(): boolean {
    return this.status === 'ready' && this.extractor !== null;
  }

  /** @returns Le nom du modèle configuré. */
  getModelName(): string {
    return this.options.model;
  }

  /**
   * Calcule l'embedding normalisé d'un texte, avec timeout.
   * @param text Texte à encoder.
   * @param kind `query` (défaut) ou `passage` : détermine le préfixe éventuel.
   * @returns Vecteur normalisé (384 dimensions pour MiniLM-L12).
   * @throws EmbeddingUnavailableError si le modèle n'est pas prêt ; TimeoutError si trop lent.
   */
  async embed(text: string, kind: EmbeddingKind = 'query'): Promise<number[]> {
    const [vector] = await withTimeout(this.compute([text], kind), this.options.timeoutMs);
    if (!vector) {
      throw new Error('Embedding vide');
    }
    return vector;
  }

  /**
   * Calcule les embeddings de plusieurs textes en un seul passage (sans timeout : usage batch).
   * @param texts Textes à encoder.
   * @param kind `passage` (défaut) ou `query`.
   * @returns Un vecteur normalisé par texte, dans le même ordre.
   * @throws EmbeddingUnavailableError si le modèle n'est pas prêt.
   */
  async embedBatch(texts: readonly string[], kind: EmbeddingKind = 'passage'): Promise<number[][]> {
    return this.compute(texts, kind);
  }

  /** Passe les textes dans le modèle : mean pooling + normalisation L2. */
  private async compute(texts: readonly string[], kind: EmbeddingKind): Promise<number[][]> {
    if (!this.extractor || this.status !== 'ready') {
      throw new EmbeddingUnavailableError(this.status);
    }
    if (texts.length === 0) {
      return [];
    }
    const prefix = kind === 'query' ? this.options.queryPrefix : this.options.passagePrefix;
    const output = await this.extractor(
      texts.map((text) => prefix + text),
      { pooling: 'mean', normalize: true },
    );
    const dimension = output.dims.at(-1) ?? 0;
    const data = Array.from(output.data, Number);
    return texts.map((_text, index) => data.slice(index * dimension, (index + 1) * dimension));
  }
}

/**
 * Préfixes attendus par le modèle : les modèles E5 ont été entraînés avec "query: " / "passage: ",
 * les modèles sentence-transformers « paraphrase » sans préfixe.
 * @param model Nom du modèle Hugging Face.
 */
export function prefixesFor(model: string): Pick<EmbeddingOptions, 'queryPrefix' | 'passagePrefix'> {
  return /e5/i.test(model) ? { queryPrefix: 'query: ', passagePrefix: 'passage: ' } : { queryPrefix: '', passagePrefix: '' };
}

/** Instance unique partagée par toute l'application. */
export const embeddingService = new EmbeddingService({
  enabled: env.EMBEDDING_ENABLED,
  model: env.EMBEDDING_MODEL,
  dtype: env.EMBEDDING_DTYPE,
  cacheDir: env.MODEL_CACHE_DIR,
  timeoutMs: env.EMBEDDING_TIMEOUT_MS,
  ...prefixesFor(env.EMBEDDING_MODEL),
});
