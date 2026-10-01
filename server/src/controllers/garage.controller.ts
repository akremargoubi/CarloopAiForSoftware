import type { Request, Response } from 'express';
import { idParamSchema } from '../schemas/common.schema';
import { createGarageSchema, listGaragesQuerySchema, updateGarageSchema } from '../schemas/garage.schema';
import * as garageService from '../services/garage.service';
import { requireUser } from '../utils/request-user';
import { validate } from '../utils/validate';

/** GET /api/garages — liste publique paginée. */
export async function list(req: Request, res: Response): Promise<void> {
  const query = validate(listGaragesQuerySchema, req.query);
  res.json(await garageService.listGarages(query));
}

/** GET /api/garages/mine — garages du PRO connecté. */
export async function listMine(req: Request, res: Response): Promise<void> {
  res.json({ items: await garageService.listOwnGarages(requireUser(req).id) });
}

/** GET /api/garages/:id — détail avec services. */
export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = validate(idParamSchema, req.params);
  res.json(await garageService.getGarage(id));
}

/** POST /api/garages — création (PRO). */
export async function create(req: Request, res: Response): Promise<void> {
  const input = validate(createGarageSchema, req.body);
  res.status(201).json(await garageService.createGarage(requireUser(req).id, input));
}

/** PATCH /api/garages/:id — modification (PRO propriétaire). */
export async function update(req: Request, res: Response): Promise<void> {
  const { id } = validate(idParamSchema, req.params);
  const input = validate(updateGarageSchema, req.body);
  res.json(await garageService.updateGarage(requireUser(req), id, input));
}

/** DELETE /api/garages/:id — suppression (PRO propriétaire). */
export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = validate(idParamSchema, req.params);
  await garageService.deleteGarage(requireUser(req), id);
  res.status(204).end();
}
