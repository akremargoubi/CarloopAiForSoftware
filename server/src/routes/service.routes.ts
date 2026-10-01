import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { searchLimiter } from '../middlewares/rate-limit';
import { asyncHandler } from '../utils/async-handler';

/** Routes /api/services. */
export const serviceRouter = Router();

serviceRouter.get('/', asyncHandler(serviceController.list));
serviceRouter.get('/search', searchLimiter, asyncHandler(serviceController.search));
serviceRouter.get('/:id', asyncHandler(serviceController.getById));
serviceRouter.post('/', authenticate, authorize('PRO', 'ADMIN'), asyncHandler(serviceController.create));
serviceRouter.patch('/:id', authenticate, authorize('PRO', 'ADMIN'), asyncHandler(serviceController.update));
serviceRouter.delete('/:id', authenticate, authorize('PRO', 'ADMIN'), asyncHandler(serviceController.remove));
