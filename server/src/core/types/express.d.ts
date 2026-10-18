import type { Role } from '../constants.js';

export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  proStatus?: 'pending' | 'approved' | 'rejected';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
