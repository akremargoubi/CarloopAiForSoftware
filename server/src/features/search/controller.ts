import type { Request, Response } from 'express';
import type { SearchRequest } from './schema.js';
import { smartSearch } from './service.js';

/** POST /api/ai/search */
export async function searchController(req: Request, res: Response) {
  const { query, filtres } = req.body as SearchRequest;
  const knownNames = req.user ? [req.user.name] : [];
  res.json(await smartSearch(query, filtres, knownNames));
}
