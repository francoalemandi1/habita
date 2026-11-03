"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type { SavedEvent, SavedCart } from "@prisma/client";
import type { SaveEventInput, SaveCartInput } from "@/lib/validations/saved-items";

// ============================================
// Queries
// ============================================

export function useSavedEvents() {
  return useQuery<SavedEvent[]>({
    queryKey: queryKeys.saved.events(),
    queryFn: () => apiFetch<SavedEvent[]>("/api/saved-items/events"),
    staleTime: 60_000,
  });
}

export function useSavedCarts() {
  return useQuery<SavedCart[]>({
    queryKey: queryKeys.saved.deals(),
    queryFn: () => apiFetch<SavedCart[]>("/api/saved-items/deals"),
    staleTime: 60_000,
  });
}

// ============================================
// Mutations
// ============================================

export function useToggleSaveEvent() {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (input: SaveEventInput) =>
      apiFetch<SavedEvent>("/api/saved-items/events", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.saved.events() });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (savedEventId: string) =>
      apiFetch<void>(`/api/saved-items/events?id=${savedEventId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.saved.events() });
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

export function useToggleSaveCart() {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (input: SaveCartInput) =>
      apiFetch<SavedCart>("/api/saved-items/deals", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.saved.deals() });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (savedCartId: string) =>
      apiFetch<void>(`/api/saved-items/deals?id=${savedCartId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.saved.deals() });
    },
  });

  const toggle = useCallback(
    (params: { savedCartId?: string; input?: SaveCartInput }) => {
      if (params.savedCartId) {
        return removeMutation.mutateAsync(params.savedCartId);
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

// ============================================
// Lookup helpers
// ============================================

export function isEventSaved(
  savedEvents: SavedEvent[] | undefined,
  culturalEventId: string | undefined,
): SavedEvent | undefined {
  if (!savedEvents || !culturalEventId) return undefined;
  return savedEvents.find((e) => e.culturalEventId === culturalEventId);
}

/** Check if a cart for this store is already saved. */
export function isCartSaved(
  savedCarts: SavedCart[] | undefined,
  storeName: string,
): SavedCart | undefined {
  if (!savedCarts) return undefined;
  return savedCarts.find((c) => c.storeName === storeName);
}
