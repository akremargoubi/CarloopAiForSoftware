import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPost, apiPut } from '@/core/api/client';
import type { FuelType, ServiceCategory } from '@/core/constants';

export const USAGES = ['urbain', 'mixte', 'autoroute'] as const;
export type Usage = (typeof USAGES)[number];

export const USAGE_LABELS: Record<Usage, string> = {
  urbain: 'Urbain (trajets courts)',
  mixte: 'Mixte',
  autoroute: 'Autoroute (longs trajets)',
};

export type Priority = 'faible' | 'moyenne' | 'haute';

export interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  kilometrage: number;
  carburant: FuelType;
  usage: Usage;
  plaque: string | null;
  surnom: string | null;
  lastPlanAt: string | null;
  createdAt: string;
}

export interface VehicleInput {
  marque: string;
  modele: string;
  annee: number;
  kilometrage: number;
  carburant: FuelType;
  usage: Usage;
  plaque?: string;
  surnom?: string;
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  kilometrage: number;
  intervention: string;
  categorie: ServiceCategory;
  coutTnd: number | null;
  notes: string | null;
}

export interface RecordInput {
  date: string;
  kilometrage: number;
  intervention: string;
  categorie: ServiceCategory;
  coutTnd?: number;
  notes?: string;
}

export interface PlanItem {
  intervention: string;
  echeance_km: number;
  echeance_date: string;
  priorite: Priority;
  categorie_service: ServiceCategory;
}

export interface MaintenancePlan {
  prochains_entretiens: PlanItem[];
  conseils: string[];
  resume: string;
}

export function useVehicles() {
  return useQuery({ queryKey: ['vehicles'], queryFn: async () => (await apiGet<{ vehicles: Vehicle[] }>('/vehicles')).vehicles });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => apiGet<{ vehicle: Vehicle; records: MaintenanceRecord[]; plan: MaintenancePlan | null }>(`/vehicles/${id}`),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: VehicleInput) => (await apiPost<{ vehicle: Vehicle }>('/vehicles', body)).vehicle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useUpdateVehicle(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: VehicleInput) => apiPut<{ vehicle: Vehicle }>(`/vehicles/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/vehicles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useAddRecord(vehicleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RecordInput) => apiPost(`/vehicles/${vehicleId}/records`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useDeleteRecord(vehicleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => apiDelete(`/vehicles/${vehicleId}/records/${recordId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useGeneratePlan(vehicleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<{ plan: MaintenancePlan; generatedAt: string }>(`/ai/maintenance-plan/${vehicleId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}
