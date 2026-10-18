import { Router } from 'express';
import { authenticate, optionalAuth } from '../../core/middlewares/auth.js';
import { asyncHandler, validateBody } from '../../core/middlewares/validate.js';
import {
  deleteConversationController,
  diagnosticController,
  getConversationController,
  listConversationsController,
} from './controller.js';
import { diagnosticRequestSchema } from './schema.js';

export const diagnosticRouter = Router();

// Visitors can chat too; conversations are saved only for logged-in users.
diagnosticRouter.post('/ai/diagnostic', optionalAuth, validateBody(diagnosticRequestSchema), asyncHandler(diagnosticController));
diagnosticRouter.get('/diagnostic/conversations', authenticate, asyncHandler(listConversationsController));
diagnosticRouter.get('/diagnostic/conversations/:id', authenticate, asyncHandler(getConversationController));
diagnosticRouter.delete('/diagnostic/conversations/:id', authenticate, asyncHandler(deleteConversationController));
