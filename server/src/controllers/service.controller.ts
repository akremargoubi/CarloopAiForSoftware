import type { Request, Response } from 'express';
import { idParamSchema } from '../schemas/common.schema';
import { createServiceSchema, listServicesQuerySchema, updateServiceSchema } from '../schemas/service.schema';
import { searchQuerySchema } from '../schemas/search.schema';
import * as catalogService from '../services/catalog.service';
import * as searchService from '../services/search.service';
import { requireUser } from '../utils/request-user';
import { validate } from '../utils/validate';

/** GET /api/services — liste publique filtrée (categorie, ville, garageId) et paginée. */
export async function list(req: Request, res: Response): Promise<void> {
  const query = validate(listServicesQuerySchema, req.query);
  res.json(await catalogService.listServices(query));
}

/** GET /api/services/search — recherche sémantique (repli mots-clés). */
export async function search(req: Request, res: Response): Promise<void> {
  const query = validate(searchQuerySchema, req.query);
  res.json(await searchService.searchServices(query));
}

/** GET /api/services/:id — détail d'un service. */
export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = validate(idParamSchema, req.params);
  res.json(await catalogService.getService(id));
}

/** POST /api/services — création (PRO propriétaire du garage). */
export async function create(req: Request, res: Response): Promise<void> {
  const input = validate(createServiceSchema, req.body);
  res.status(201).json(await catalogService.createService(requireUser(req), input));
}

/** PATCH /api/services/:id — modification (PRO propriétaire). */
export async function update(req: Request, res: Response): Promise<void> {
  const { id } = validate(idParamSchema, req.params);
  const input = validate(updateServiceSchema, req.body);
  res.json(await catalogService.updateService(requireUser(req), id, input));
}

/** DELETE /api/services/:id — suppression (PRO propriétaire). */
export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = validate(idParamSchema, req.params);
  await catalogService.deleteService(requireUser(req), id);
  res.status(204).end();
}
