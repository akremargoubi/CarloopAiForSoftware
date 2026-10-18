import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { conflict, unauthorized } from '../errors.js';
import { requireUser, signToken } from '../middlewares/auth.js';
import { ProviderModel } from '../models/Provider.js';
import { UserModel, toPublicUser } from '../models/User.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

const BCRYPT_ROUNDS = 10;

/** POST /api/auth/register */
export async function register(req: Request, res: Response) {
  const input = req.body as RegisterInput;
  if (await UserModel.exists({ email: input.email })) {
    throw conflict('Un compte existe déjà avec cet email');
  }
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash,
    role: input.role,
    proStatus: input.role === 'pro' ? 'pending' : undefined,
  });
  if (input.role === 'pro') {
    // The business stays hidden until an admin approves the pro account.
    await ProviderModel.create({
      name: input.businessName,
      owner: user._id,
      city: input.city,
      isActive: false,
    });
  }
  res.status(201).json({ token: signToken(user.id, user.role), user: toPublicUser(user) });
}

/** POST /api/auth/login */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body as LoginInput;
  const user = await UserModel.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw unauthorized('Email ou mot de passe incorrect');
  }
  res.json({ token: signToken(user.id, user.role), user: toPublicUser(user) });
}

/** GET /api/auth/me */
export async function me(req: Request, res: Response) {
  const user = await UserModel.findById(requireUser(req).id);
  if (!user) throw unauthorized();
  res.json({ user: toPublicUser(user) });
}
