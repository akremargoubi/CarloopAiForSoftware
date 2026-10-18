import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { Role } from '../constants.js';
import { forbidden, unauthorized } from '../errors.js';
import { UserModel } from '../models/User.js';
import type { AuthUser } from '../types/express.js';

interface TokenPayload {
  sub: string;
  role: Role;
}

/** Signs a JWT for the given user. */
export function signToken(userId: string, role: Role): string {
  return jwt.sign({ sub: userId, role } satisfies TokenPayload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

async function resolveUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  let payload: TokenPayload;
  try {
    payload = jwt.verify(header.slice(7), config.jwt.secret) as TokenPayload;
  } catch {
    throw unauthorized('Session invalide ou expirée');
  }
  const user = await UserModel.findById(payload.sub).lean();
  if (!user) throw unauthorized('Utilisateur introuvable');
  return {
    id: String(user._id),
    role: user.role,
    name: user.name,
    email: user.email,
    proStatus: user.proStatus ?? undefined,
  };
}

/** Requires a valid JWT and attaches `req.user`. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await resolveUser(req);
    if (!user) throw unauthorized();
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Attaches `req.user` when a valid JWT is present, otherwise continues anonymously. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.user = (await resolveUser(req)) ?? undefined;
    next();
  } catch (err) {
    next(err);
  }
}

/** Restricts a route to the given roles (must be used after `authenticate`). */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

/** Restricts a route to pro accounts approved by an admin. */
export function requireApprovedPro(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'pro') return next(forbidden());
  if (req.user.proStatus !== 'approved') {
    return next(forbidden('Votre compte professionnel est en attente de validation'));
  }
  next();
}

/** Returns the authenticated user or throws 401. */
export function requireUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
