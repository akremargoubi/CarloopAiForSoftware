import bcrypt from 'bcrypt';
import type { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';
import { HttpError } from '../utils/http-error';
import { signToken } from './token.service';

/** Champs publics d'un utilisateur : le hash du mot de passe n'en fait jamais partie. */
export const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

/** Utilisateur tel que renvoyé par l'API. */
export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

/** Résultat d'une inscription ou d'une connexion. */
export interface AuthResult {
  user: PublicUser;
  token: string;
}

let dummyHash: Promise<string> | null = null;

/** Hash factice comparé quand l'email est inconnu, pour un temps de réponse constant. */
function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash('carloop-dummy-password', env.BCRYPT_ROUNDS);
  return dummyHash;
}

/**
 * Inscrit un nouvel utilisateur.
 * @param input Données validées.
 * @returns L'utilisateur public et son token.
 * @throws HttpError 409 si l'email est déjà utilisé.
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) {
    throw HttpError.conflict('Cet email est déjà utilisé');
  }
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
      role: input.role,
    },
    select: publicUserSelect,
  });
  return { user, token: signToken({ id: user.id, role: user.role }) };
}

/**
 * Authentifie un utilisateur par email et mot de passe.
 * @param input Identifiants validés.
 * @returns L'utilisateur public et son token.
 * @throws HttpError 401 avec un message générique si les identifiants sont incorrects.
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...publicUserSelect, passwordHash: true },
  });
  const passwordOk = await bcrypt.compare(input.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !passwordOk) {
    throw HttpError.unauthorized('Email ou mot de passe incorrect');
  }
  const { passwordHash: _omitted, ...publicUser } = user;
  return { user: publicUser, token: signToken({ id: user.id, role: user.role }) };
}

/**
 * Récupère le profil public d'un utilisateur.
 * @param userId Identifiant de l'utilisateur.
 * @returns Le profil public.
 * @throws HttpError 401 si l'utilisateur n'existe plus (token orphelin).
 */
export async function getProfile(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) {
    throw HttpError.unauthorized('Utilisateur introuvable');
  }
  return user;
}
