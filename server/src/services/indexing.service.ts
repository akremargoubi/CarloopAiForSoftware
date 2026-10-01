import type { ServiceCategory } from '@prisma/client';
import { prisma } from '../config/prisma';
import { CATEGORY_LABELS } from '../utils/categories';
import { logger } from '../utils/logger';
import { embeddingService, EmbeddingUnavailableError } from './embedding.service';

const BATCH_SIZE = 16;

/** Champs d'un service utilisés pour construire son embedding. */
export interface IndexableService {
  title: string;
  category: ServiceCategory;
  description: string;
}

/** Bilan d'une réindexation. */
export interface ReindexReport {
  total: number;
  indexed: number;
  durationMs: number;
  model: string;
}

/**
 * Construit le texte encodé pour un service : "titre. catégorie. description".
 * @param service Champs du service.
 */
export function buildEmbeddingText(service: IndexableService): string {
  return `${service.title}. ${CATEGORY_LABELS[service.category]}. ${service.description}`;
}

/**
 * Calcule l'embedding d'un service à la création / modification.
 * Si le modèle est indisponible, renvoie `[]` : le service reste enregistré et sera
 * indexé plus tard par `npm run reindex` (il reste trouvable en mode mots-clés).
 * @param service Champs du service.
 */
export async function computeServiceEmbedding(service: IndexableService): Promise<number[]> {
  if (!embeddingService.isReady()) {
    return [];
  }
  try {
    return await embeddingService.embed(buildEmbeddingText(service), 'passage');
  } catch (error: unknown) {
    logger.warn(`Embedding non calculé (${error instanceof Error ? error.message : 'erreur inconnue'})`);
    return [];
  }
}

/**
 * Recalcule les embeddings de tous les services, par lots.
 * @returns Le bilan de l'indexation.
 * @throws EmbeddingUnavailableError si le modèle n'est pas chargé.
 */
export async function reindexAllServices(): Promise<ReindexReport> {
  if (!embeddingService.isReady()) {
    throw new EmbeddingUnavailableError(embeddingService.getStatus());
  }
  const startedAt = Date.now();
  const services = await prisma.service.findMany({
    select: { id: true, title: true, category: true, description: true },
    orderBy: { createdAt: 'asc' },
  });

  let indexed = 0;
  for (let start = 0; start < services.length; start += BATCH_SIZE) {
    const batch = services.slice(start, start + BATCH_SIZE);
    const vectors = await embeddingService.embedBatch(batch.map(buildEmbeddingText));
    await prisma.$transaction(
      batch.map((service, index) =>
        prisma.service.update({ where: { id: service.id }, data: { embedding: vectors[index] ?? [] } }),
      ),
    );
    indexed += batch.length;
  }
  return {
    total: services.length,
    indexed,
    durationMs: Date.now() - startedAt,
    model: embeddingService.getModelName(),
  };
}
