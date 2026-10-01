import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { embeddingService } from './services/embedding.service';
import { logger } from './utils/logger';

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info(`API CarLoop démarrée sur http://localhost:${env.PORT}/api`);
});

// Chargement unique du modèle, en arrière-plan : l'API répond déjà (recherche en mode
// mots-clés) pendant le chargement, puis bascule automatiquement en mode sémantique.
void embeddingService.init();

/** Arrêt propre : ferme le serveur HTTP puis la connexion Prisma. */
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} reçu, arrêt en cours…`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
