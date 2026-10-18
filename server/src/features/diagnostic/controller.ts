import type { Request, Response } from 'express';
import { requireUser } from '../../core/middlewares/auth.js';
import type { DiagnosticRequest } from './schema.js';
import { deleteConversation, diagnose, getConversation, listConversations } from './service.js';

/** POST /api/ai/diagnostic */
export async function diagnosticController(req: Request, res: Response) {
  res.json(await diagnose(req.body as DiagnosticRequest, req.user));
}

/** GET /api/diagnostic/conversations */
export async function listConversationsController(req: Request, res: Response) {
  res.json({ conversations: await listConversations(requireUser(req).id) });
}

/** GET /api/diagnostic/conversations/:id */
export async function getConversationController(req: Request, res: Response) {
  res.json({ conversation: await getConversation(requireUser(req).id, req.params.id) });
}

/** DELETE /api/diagnostic/conversations/:id */
export async function deleteConversationController(req: Request, res: Response) {
  await deleteConversation(requireUser(req).id, req.params.id);
  res.status(204).end();
}
