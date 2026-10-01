import { Router } from 'express';
import * as reservationController from '../controllers/reservation.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { asyncHandler } from '../utils/async-handler';

/** Routes /api/reservations (toutes authentifiées). */
export const reservationRouter = Router();

reservationRouter.use(authenticate);
reservationRouter.post('/', authorize('CLIENT'), asyncHandler(reservationController.create));
reservationRouter.get('/mine', asyncHandler(reservationController.listMine));
reservationRouter.patch('/:id/status', asyncHandler(reservationController.updateStatus));
