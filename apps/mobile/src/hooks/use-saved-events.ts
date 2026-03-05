import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type { SaveEventInput, SavedEvent } from "@habita/contracts";

export type { SaveEventInput, SavedEvent };


export function useSavedEvents() {
  return useQuery({
    queryKey: queryKeys.saved.events(),
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.saved.events() });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (savedEventId: string) =>
      mobileApi.delete<void>(`/api/saved-items/events?id=${savedEventId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.saved.events() });
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
