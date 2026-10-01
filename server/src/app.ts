import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { apiRouter } from './routes';

/**
 * Construit l'application Express (sans écouter de port, pour les tests Supertest).
 * @returns L'application configurée.
 */
export function createApp(): Express {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
