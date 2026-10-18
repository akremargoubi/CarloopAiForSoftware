import { Router } from 'express';
import { optionalAuth } from '../../core/middlewares/auth.js';
import { asyncHandler, validateBody } from '../../core/middlewares/validate.js';
import { searchController } from './controller.js';
import { searchRequestSchema } from './schema.js';

export const searchRouter = Router();

// Public endpoint: visitors can search without an account.
searchRouter.post('/ai/search', optionalAuth, validateBody(searchRequestSchema), asyncHandler(searchController));
