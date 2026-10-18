import type { Request, Response } from 'express';
import { z } from 'zod';
import { requireUser } from '../../core/middlewares/auth.js';
import type { RecordBody, VehicleBody } from './schema.js';
import {
  addRecord,
  createVehicle,
  deleteRecord,
  deleteVehicle,
  generatePlan,
  getVehicle,
  listVehicles,
  updateVehicle,
} from './service.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');

/** POST /api/ai/maintenance-plan/:vehicleId */
export async function planController(req: Request, res: Response) {
  res.json(await generatePlan(requireUser(req), objectId.parse(req.params.vehicleId)));
}

/** GET /api/vehicles */
export async function listVehiclesController(req: Request, res: Response) {
  res.json({ vehicles: await listVehicles(requireUser(req).id) });
}

/** GET /api/vehicles/:id */
export async function getVehicleController(req: Request, res: Response) {
  res.json(await getVehicle(requireUser(req).id, objectId.parse(req.params.id)));
}

/** POST /api/vehicles */
export async function createVehicleController(req: Request, res: Response) {
  res.status(201).json({ vehicle: await createVehicle(requireUser(req).id, req.body as VehicleBody) });
}

/** PUT /api/vehicles/:id */
export async function updateVehicleController(req: Request, res: Response) {
  res.json({ vehicle: await updateVehicle(requireUser(req).id, objectId.parse(req.params.id), req.body as VehicleBody) });
}

/** DELETE /api/vehicles/:id */
export async function deleteVehicleController(req: Request, res: Response) {
  await deleteVehicle(requireUser(req).id, objectId.parse(req.params.id));
  res.status(204).end();
}

/** POST /api/vehicles/:id/records */
export async function addRecordController(req: Request, res: Response) {
  res.status(201).json({ record: await addRecord(requireUser(req).id, objectId.parse(req.params.id), req.body as RecordBody) });
}

/** DELETE /api/vehicles/:id/records/:recordId */
export async function deleteRecordController(req: Request, res: Response) {
  await deleteRecord(requireUser(req).id, objectId.parse(req.params.id), objectId.parse(req.params.recordId));
  res.status(204).end();
}
