import { Router } from 'express';
import { embeddingService } from '../services/embedding.service';
import { aiRouter } from './ai.routes';
import { authRouter } from './auth.routes';
import { garageRouter } from './garage.routes';
import { reservationRouter } from './reservation.routes';
import { serviceRouter } from './service.routes';

/** Routeur racine monté sur /api. */
export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', embeddingModel: embeddingService.getStatus() });
});
apiRouter.use('/auth', authRouter);
apiRouter.use('/garages', garageRouter);
apiRouter.use('/services', serviceRouter);
apiRouter.use('/reservations', reservationRouter);
apiRouter.use('/ai', aiRouter);
