import { z } from 'zod';
import { CITIES } from '../constants.js';

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Nom trop court').max(80),
    email: z.string().trim().toLowerCase().email('Email invalide'),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(100),
    phone: z.string().trim().max(20).optional(),
    role: z.enum(['client', 'pro']).default('client'),
    // Required for pro accounts: the business created along with the account.
    businessName: z.string().trim().min(2).max(100).optional(),
    city: z.enum(CITIES).optional(),
  })
  .refine((d) => d.role !== 'pro' || (d.businessName && d.city), {
    message: 'Le nom du garage et la ville sont obligatoires pour un compte professionnel',
    path: ['businessName'],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
