import type { Request, Response } from 'express';
import { loginSchema, registerSchema } from '../schemas/auth.schema';
import * as authService from '../services/auth.service';
import { requireUser } from '../utils/request-user';
import { validate } from '../utils/validate';

/** POST /api/auth/register — crée un compte CLIENT ou PRO. */
export async function register(req: Request, res: Response): Promise<void> {
  const input = validate(registerSchema, req.body);
  res.status(201).json(await authService.register(input));
}

/** POST /api/auth/login — renvoie un JWT. */
export async function login(req: Request, res: Response): Promise<void> {
  const input = validate(loginSchema, req.body);
  res.json(await authService.login(input));
}

/** GET /api/auth/me — profil de l'utilisateur connecté. */
export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getProfile(requireUser(req).id);
  res.json({ user });
}
