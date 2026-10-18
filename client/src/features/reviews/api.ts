import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '@/core/api/client';

export interface ReviewsSummary {
  resume: string;
  sentiment_global: 'positif' | 'mitige' | 'negatif';
  points_forts: string[];
  points_faibles: string[];
  score_confiance: number;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  serviceName: string | null;
  proReply: { text: string; repliedAt: string } | null;
  createdAt: string;
}

export interface ReviewableBooking {
  bookingId: string;
  provider: { id: string; name: string; city: string };
  serviceName: string;
  scheduledAt: string | null;
}

export interface ReplySuggestion {
  ton: string;
  texte: string;
}

export function useReviewsSummary(providerId: string) {
  return useQuery({
    queryKey: ['reviews', 'summary', providerId],
    queryFn: () =>
      apiPost<{ summary: ReviewsSummary | null; reviewsCount: number; cached: boolean; generatedAt: string | null }>(
        `/ai/reviews-summary/${providerId}`,
      ),
    retry: false,
    staleTime: 10 * 60_000,
  });
}

export function useProviderReviews(providerId: string) {
  return useQuery({
    queryKey: ['reviews', 'provider', providerId],
    queryFn: () => apiGet<{ reviews: Review[] }>(`/reviews/provider/${providerId}`),
  });
}

export function useReviewableBookings() {
  return useQuery({ queryKey: ['reviews', 'reviewable'], queryFn: () => apiGet<{ bookings: ReviewableBooking[] }>('/reviews/reviewable') });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { bookingId: string; rating: number; comment: string }) => apiPost('/reviews', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });
}

export function useProReviews() {
  return useQuery({ queryKey: ['reviews', 'pro'], queryFn: () => apiGet<{ reviews: Review[] }>('/reviews/pro') });
}

export function useSuggestReplies() {
  return useMutation({
    mutationFn: (reviewId: string) => apiPost<{ propositions: ReplySuggestion[] }>('/ai/review-reply', { reviewId }),
  });
}

export function useSaveReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => apiPut(`/reviews/${id}/reply`, { text }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });
}
