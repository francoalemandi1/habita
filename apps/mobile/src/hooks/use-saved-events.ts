import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

/** Input shape for saving an event (mirrors web SaveEventInput). */
interface SaveEventInput {
  culturalEventId?: string;
  title: string;
  description?: string;
  category: string;
  startDate?: string | null;
  venueName?: string | null;
  address?: string | null;
  priceRange: string;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  artists?: string[];
  tags?: string[];
  culturalCategory?: string | null;
  highlightReason?: string | null;
  ticketUrl?: string | null;
  bookingUrl?: string | null;
  dateInfo?: string | null;
}

/** Shape returned by the API (mirrors Prisma SavedEvent). */
interface SavedEvent {
  id: string;
  culturalEventId: string | null;
  title: string;
  description: string | null;
  category: string;
  startDate: string | null;
  venueName: string | null;
  address: string | null;
  priceRange: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  artists: string[];
  tags: string[];
  culturalCategory: string | null;
  highlightReason: string | null;
  ticketUrl: string | null;
  bookingUrl: string | null;
  dateInfo: string | null;
  savedAt: string;
}

const SAVED_EVENTS_KEY = ["mobile", "saved-events"] as const;

export function useSavedEvents() {
  return useQuery({
    queryKey: SAVED_EVENTS_KEY,
    queryFn: async () => mobileApi.get<SavedEvent[]>("/api/saved-items/events"),
    staleTime: 60_000,
  });
}

export function useToggleSaveEvent() {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (input: SaveEventInput) =>
      mobileApi.post<SavedEvent>("/api/saved-items/events", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SAVED_EVENTS_KEY });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (savedEventId: string) =>
      mobileApi.delete<void>(`/api/saved-items/events?id=${savedEventId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SAVED_EVENTS_KEY });
    },
  });

  const toggle = useCallback(
    (params: { savedEventId?: string; input?: SaveEventInput }) => {
      if (params.savedEventId) {
        return removeMutation.mutateAsync(params.savedEventId);
      }
      if (params.input) {
        return saveMutation.mutateAsync(params.input);
      }
    },
    [saveMutation, removeMutation],
  );

  return {
    toggle,
    isPending: saveMutation.isPending || removeMutation.isPending,
  };
}

/** Check if a cultural event is already saved. */
export function isEventSaved(
  savedEvents: SavedEvent[] | undefined,
  culturalEventId: string | undefined,
): SavedEvent | undefined {
  if (!savedEvents || !culturalEventId) return undefined;
  return savedEvents.find((e) => e.culturalEventId === culturalEventId);
}

export type { SavedEvent, SaveEventInput };
