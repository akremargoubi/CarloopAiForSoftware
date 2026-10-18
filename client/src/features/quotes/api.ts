import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiGet, apiPatch, apiPost } from '@/core/api/client';
import type { FuelType, ServiceCategory } from '@/core/constants';
import type { Provider } from '@/core/types';

export interface VehicleInput {
  marque: string;
  modele: string;
  annee: number;
  kilometrage: number;
  carburant: FuelType;
  vehicleId?: string;
}

export interface QuoteEstimate {
  prix_min_tnd: number;
  prix_max_tnd: number;
  pieces_probables: { piece: string; prix_estime_tnd: number }[];
  main_oeuvre_heures: number;
  hypotheses: string[];
  avertissement: string;
}

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export interface Quote {
  id: string;
  items: { label: string; amountTnd: number }[];
  totalTnd: number;
  message: string;
  status: 'sent' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Booking {
  id: string;
  provider: { id: string; name: string; city: string; address: string } | null;
  client?: { name: string; phone: string | null };
  category: ServiceCategory;
  serviceName: string;
  catalogPriceTnd: number;
  scheduledAt: string;
  durationMin: number;
  vehicle: Partial<VehicleInput>;
  description: string;
  status: BookingStatus;
  aiEstimate: QuoteEstimate | null;
  proNote: string | null;
  quotes: Quote[];
  createdAt: string;
}

export interface EstimateRequest {
  vehicule: VehicleInput;
  categorie: ServiceCategory;
  service?: string;
  description?: string;
  providerId?: string;
}

export function useEstimate() {
  return useMutation({
    mutationFn: ({ vehicule, ...rest }: EstimateRequest) => {
      // The vehicle id is a local reference only, it is not useful for the estimation.
      const { vehicleId: _ignored, ...vehicle } = vehicule;
      return apiPost<{ estimation: QuoteEstimate }>('/ai/quote-estimate', { vehicule: vehicle, ...rest });
    },
  });
}

export function useProviders(categorie: ServiceCategory | null, ville: string | null) {
  return useQuery({
    queryKey: ['providers', 'list', categorie, ville],
    queryFn: () =>
      apiGet<{ providers: Provider[] }>('/providers', { categorie: categorie ?? undefined, ville: ville ?? undefined, limit: 30 }),
  });
}

export function useProviderById(id: string | null) {
  return useQuery({
    queryKey: ['providers', id],
    queryFn: () => apiGet<{ provider: Provider }>(`/providers/${id}`),
    enabled: Boolean(id),
  });
}

export function useSlots(providerId: string | null, date: string) {
  return useQuery({
    queryKey: ['bookings', 'slots', providerId, date],
    queryFn: () => apiGet<{ slots: string[] }>('/bookings/slots', { providerId, date }),
    enabled: Boolean(providerId && date),
  });
}

export interface SavedVehicle {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  kilometrage: number;
  carburant: FuelType;
}

/**
 * Vehicles saved by the client. They come from the maintenance module through the API only:
 * when that module is disabled the endpoint returns 404 and the list is simply empty.
 */
export function useSavedVehicles(enabled: boolean) {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      try {
        return (await apiGet<{ vehicles: SavedVehicle[] }>('/vehicles')).vehicles;
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return [];
        throw err;
      }
    },
    enabled,
    retry: false,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      providerId: string;
      serviceId: string;
      scheduledAt: string;
      vehicule: VehicleInput;
      description: string;
      estimation?: QuoteEstimate;
    }) => apiPost<{ booking: { id: string } }>('/bookings', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useMyBookings() {
  return useQuery({ queryKey: ['bookings', 'mine'], queryFn: () => apiGet<{ bookings: Booking[] }>('/bookings/mine') });
}

export function useProBookings(status: BookingStatus | '') {
  return useQuery({
    queryKey: ['bookings', 'pro', status],
    queryFn: () => apiGet<{ bookings: Booking[] }>('/bookings/pro', { status: status || undefined }),
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: Exclude<BookingStatus, 'pending'>; note?: string }) =>
      apiPatch<{ booking: Booking }>(`/bookings/${id}/status`, { status, note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useSendQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items, message }: { id: string; items: { label: string; amountTnd: number }[]; message: string }) =>
      apiPost<{ booking: Booking }>(`/bookings/${id}/quotes`, { items, message }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useDecideQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'accepted' | 'declined' }) =>
      apiPatch<{ booking: Booking }>(`/quotes/${id}`, { decision }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });
}
