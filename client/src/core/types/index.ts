import type { ServiceCategory } from '../constants';

export type Role = 'client' | 'pro' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  proStatus: 'pending' | 'approved' | 'rejected' | null;
  createdAt: string;
}

export interface ProviderService {
  id: string;
  category: ServiceCategory;
  name: string;
  priceTnd: number;
  durationMin: number;
}

export interface Provider {
  id: string;
  name: string;
  description: string;
  city: string;
  address: string;
  phone: string;
  categories: ServiceCategory[];
  services: ProviderService[];
  openingHours: { day: number; open: string; close: string }[];
  ratingAvg: number;
  ratingCount: number;
  isActive: boolean;
}
