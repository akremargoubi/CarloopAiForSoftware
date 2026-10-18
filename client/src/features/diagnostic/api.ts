import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPost } from '@/core/api/client';
import type { ServiceCategory } from '@/core/constants';

export type Probability = 'faible' | 'moyenne' | 'elevee';
export type Urgency = 'faible' | 'moyenne' | 'critique';

export interface Diagnostic {
  reponse: string;
  causes_probables: { cause: string; probabilite: Probability }[];
  urgence: Urgency;
  service_recommande: ServiceCategory;
  conseil_securite: string;
}

export interface VehicleContext {
  marque?: string;
  modele?: string;
  annee?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  diagnostic: Diagnostic | null;
}

export interface DiagnosticRequest {
  message: string;
  conversationId?: string;
  vehicule?: VehicleContext;
  historique?: { role: 'user' | 'assistant'; content: string }[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  messagesCount: number;
  updatedAt: string;
}

export function useSendDiagnostic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DiagnosticRequest) =>
      apiPost<{ conversationId: string | null; diagnostic: Diagnostic }>('/ai/diagnostic', body),
    onSuccess: (res) => {
      if (res.conversationId) queryClient.invalidateQueries({ queryKey: ['diagnostic', 'conversations'] });
    },
  });
}

export function useConversations(enabled: boolean) {
  return useQuery({
    queryKey: ['diagnostic', 'conversations'],
    queryFn: () => apiGet<{ conversations: ConversationSummary[] }>('/diagnostic/conversations'),
    enabled,
  });
}

export async function fetchConversation(id: string) {
  return apiGet<{ conversation: { id: string; vehicule: VehicleContext | null; messages: ChatMessage[] } }>(
    `/diagnostic/conversations/${id}`,
  );
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/diagnostic/conversations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['diagnostic', 'conversations'] }),
  });
}
