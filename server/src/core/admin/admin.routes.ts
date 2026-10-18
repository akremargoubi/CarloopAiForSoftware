import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AiLogModel } from '../../ai/AiLog.model.js';
import { notFound } from '../errors.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { asyncHandler, validateBody } from '../middlewares/validate.js';
import { ProviderModel } from '../models/Provider.js';
import { UserModel, toPublicUser } from '../models/User.js';

/**
 * Counts documents of a collection owned by an optional feature (e.g. bookings).
 * Uses the raw collection so the core does not import feature code; returns 0 when absent.
 */
async function countByStatus(collection: string): Promise<Record<string, number>> {
  const db = mongoose.connection.db;
  if (!db) return {};
  const rows = await db
    .collection(collection)
    .aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    .toArray();
  return Object.fromEntries(rows.map((r) => [r._id ?? 'inconnu', r.count]));
}

async function getStats(_req: Request, res: Response) {
  const [usersByRole, pendingPros, providers, bookingsByStatus, aiByModule] = await Promise.all([
    UserModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    UserModel.countDocuments({ role: 'pro', proStatus: 'pending' }),
    ProviderModel.countDocuments({ isActive: true }),
    countByStatus('bookings'),
    AiLogModel.aggregate<{
      _id: string;
      calls: number;
      errors: number;
      avgDurationMs: number;
      totalTokens: number;
      mockCalls: number;
    }>([
      {
        $group: {
          _id: '$module',
          calls: { $sum: 1 },
          errors: { $sum: { $cond: ['$success', 0, 1] } },
          avgDurationMs: { $avg: '$durationMs' },
          totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
          mockCalls: { $sum: { $cond: ['$mock', 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const bookingsTotal = Object.values(bookingsByStatus).reduce((a, b) => a + b, 0);
  res.json({
    users: Object.fromEntries(usersByRole.map((r) => [r._id, r.count])),
    pendingPros,
    activeProviders: providers,
    bookings: { total: bookingsTotal, byStatus: bookingsByStatus },
    ai: aiByModule.map((m) => ({
      module: m._id,
      calls: m.calls,
      errors: m.errors,
      errorRate: m.calls ? Math.round((m.errors / m.calls) * 1000) / 10 : 0,
      avgDurationMs: Math.round(m.avgDurationMs ?? 0),
      totalTokens: m.totalTokens,
      mockCalls: m.mockCalls,
    })),
  });
}

async function listPros(req: Request, res: Response) {
  const status = z.enum(['pending', 'approved', 'rejected']).optional().parse(req.query.status);
  const pros = await UserModel.find({ role: 'pro', ...(status ? { proStatus: status } : {}) }).sort({
    createdAt: -1,
  });
  const providers = await ProviderModel.find({ owner: { $in: pros.map((p) => p._id) } }).lean();
  const byOwner = new Map(providers.map((p) => [String(p.owner), p]));
  res.json({
    pros: pros.map((p) => {
      const provider = byOwner.get(p.id);
      return {
        ...toPublicUser(p),
        provider: provider ? { id: String(provider._id), name: provider.name, city: provider.city } : null,
      };
    }),
  });
}

const decisionSchema = z.object({ approved: z.boolean() });

async function decidePro(req: Request, res: Response) {
  const { approved } = req.body as z.infer<typeof decisionSchema>;
  const pro = await UserModel.findOne({ _id: req.params.id, role: 'pro' });
  if (!pro) throw notFound('Compte professionnel introuvable');
  pro.proStatus = approved ? 'approved' : 'rejected';
  await pro.save();
  await ProviderModel.updateMany({ owner: pro._id }, { isActive: approved });
  res.json({ user: toPublicUser(pro) });
}

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));
adminRouter.get('/stats', asyncHandler(getStats));
adminRouter.get('/pros', asyncHandler(listPros));
adminRouter.patch('/pros/:id', validateBody(decisionSchema), asyncHandler(decidePro));
