import { Role } from '@prisma/client';
import { z } from 'zod';

const email = z.string().trim().toLowerCase().max(254).pipe(z.email('Email invalide'));

/** Body de POST /api/auth/register. ADMIN ne peut pas s'auto-inscrire. */
export const registerSchema = z.object({
  email,
  // bcrypt ne prend en compte que les 72 premiers octets.
  password: z.string().min(8, 'Au moins 8 caractères').max(72, 'Au plus 72 caractères'),
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{8,15}$/, 'Numéro de téléphone invalide')
    .optional(),
  role: z.enum([Role.CLIENT, Role.PRO]).default(Role.CLIENT),
});

/** Body de POST /api/auth/login. */
export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(72),
});

/** Données d'inscription validées. */
export type RegisterInput = z.output<typeof registerSchema>;
/** Données de connexion validées. */
export type LoginInput = z.output<typeof loginSchema>;
