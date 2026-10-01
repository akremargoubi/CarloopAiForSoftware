import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { aiLimiter } from '../middlewares/rate-limit';
import { asyncHandler } from '../utils/async-handler';

/** Routes /api/ai (module d'Akrem). */
export const aiRouter = Router();

aiRouter.post('/diagnose', authenticate, authorize('CLIENT'), ...aiLimiter, asyncHandler(aiController.diagnose));
