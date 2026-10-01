import { Router } from 'express';
import * as garageController from '../controllers/garage.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { asyncHandler } from '../utils/async-handler';

/** Routes /api/garages. */
export const garageRouter = Router();

garageRouter.get('/', asyncHandler(garageController.list));
garageRouter.get('/mine', authenticate, authorize('PRO'), asyncHandler(garageController.listMine));
garageRouter.get('/:id', asyncHandler(garageController.getById));
garageRouter.post('/', authenticate, authorize('PRO'), asyncHandler(garageController.create));
garageRouter.patch('/:id', authenticate, authorize('PRO', 'ADMIN'), asyncHandler(garageController.update));
garageRouter.delete('/:id', authenticate, authorize('PRO', 'ADMIN'), asyncHandler(garageController.remove));
