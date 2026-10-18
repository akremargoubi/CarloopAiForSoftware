import { Router } from 'express';
import { authenticate, requireRole } from '../../core/middlewares/auth.js';
import { asyncHandler, validateBody } from '../../core/middlewares/validate.js';
import {
  addRecordController,
  createVehicleController,
  deleteRecordController,
  deleteVehicleController,
  getVehicleController,
  listVehiclesController,
  planController,
  updateVehicleController,
} from './controller.js';
import { recordBodySchema, vehicleBodySchema } from './schema.js';

export const maintenanceRouter = Router();
const client = [authenticate, requireRole('client')];

// AI endpoint
maintenanceRouter.post('/ai/maintenance-plan/:vehicleId', ...client, asyncHandler(planController));

// Business endpoints: vehicles and maintenance history
maintenanceRouter.get('/vehicles', ...client, asyncHandler(listVehiclesController));
maintenanceRouter.post('/vehicles', ...client, validateBody(vehicleBodySchema), asyncHandler(createVehicleController));
maintenanceRouter.get('/vehicles/:id', ...client, asyncHandler(getVehicleController));
maintenanceRouter.put('/vehicles/:id', ...client, validateBody(vehicleBodySchema), asyncHandler(updateVehicleController));
maintenanceRouter.delete('/vehicles/:id', ...client, asyncHandler(deleteVehicleController));
maintenanceRouter.post('/vehicles/:id/records', ...client, validateBody(recordBodySchema), asyncHandler(addRecordController));
maintenanceRouter.delete('/vehicles/:id/records/:recordId', ...client, asyncHandler(deleteRecordController));
