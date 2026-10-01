import { prisma } from '../config/prisma';
import { embeddingService } from '../services/embedding.service';
import { reindexAllServices } from '../services/indexing.service';

/** `npm run reindex` : recalcule les embeddings de tous les services. */
async function main(): Promise<void> {
  try {
    console.info('Chargement du modèle (le premier lancement télécharge ~120 Mo)…');
    const status = await embeddingService.init();
    if (status !== 'ready') {
      throw new Error(`Modèle indisponible (état : ${status}). Vérifiez EMBEDDING_ENABLED et la connexion.`);
    }
    const report = await reindexAllServices();
    console.info(
      `Réindexation terminée : ${report.indexed}/${report.total} services en ${report.durationMs} ms (${report.model})`,
    );
  } catch (error: unknown) {
    console.error('Échec de la réindexation :', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
