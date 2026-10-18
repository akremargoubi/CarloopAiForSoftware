import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { isAiMockMode } from './ai/index.js';
import { adminRouter } from './core/admin/admin.routes.js';
import { authRouter } from './core/auth/auth.routes.js';
import { config } from './core/config.js';
import { optionalAuth } from './core/middlewares/auth.js';
import { aiRateLimit } from './core/middlewares/aiRateLimit.js';
import { errorHandler, notFoundHandler } from './core/middlewares/errorHandler.js';
import { metaRouter, providerRouter } from './core/providers/provider.routes.js';
import type { FeatureModule } from './core/types/feature.js';
import * as featureRegistry from './features/index.js';

/** Feature modules enabled in server/src/features/index.ts. */
export const features = Object.values(featureRegistry) as FeatureModule[];

/** Builds the Express application (also used by the integration tests). */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '200kb' }));
  if (!config.isTest) app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      ai: { configured: Boolean(config.ai.apiKey), mock: isAiMockMode() },
      features: features.map((f) => f.name),
    });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/meta', metaRouter);
  app.use('/api/providers', providerRouter);
  app.use('/api/admin', adminRouter);

  // Rate limit every AI endpoint (user resolved first so the limit is per account).
  app.use('/api/ai', optionalAuth, aiRateLimit);
  for (const feature of features) app.use('/api', feature.router);

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}
