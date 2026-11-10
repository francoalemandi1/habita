"use client";

import { useCallback } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { sortShoppingListItems } from "@habita/prices";
import { OFFLINE_MUTATION_KEYS } from "@/lib/offline-mutation-keys";
import { offlineMutationRetry } from "@/lib/offline-network";

import type { ShoppingListItem, ShoppingListResponse } from "@habita/contracts";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/** Shared by useShoppingList and the nav intent prefetch so both hit the same cache entry. */
export function shoppingListQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.shoppingList.list(),
    queryFn: () => apiFetch<ShoppingListResponse>("/api/shopping-list"),
    staleTime: FIVE_MINUTES_MS,
    refetchOnWindowFocus: true,
  });
}

/** Shared household shopping list — unchecked first, checked at the end. */
export function useShoppingList() {
  return useQuery(shoppingListQueryOptions());
}

interface AddItemInput {
  name: string;
  quantity?: number;
  clientId: string;
}

/**
 * Adds an item, optimistically appending it to the cache under a temp id.
 * Rolls back on failure; the caller shows the error snackbar.
 */
export function useAddShoppingListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: OFFLINE_MUTATION_KEYS.shoppingItemAdd,
    retry: offlineMutationRetry,
    mutationFn: (input: AddItemInput) =>
      apiFetch<{ item: ShoppingListItem }>("/api/shopping-list", { method: "POST", body: input }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shoppingList.list() });
      const previous = queryClient.getQueryData<ShoppingListResponse>(queryKeys.shoppingList.list());
      const now = new Date().toISOString();
      const optimisticItem: ShoppingListItem = {
        id: `pending-${input.clientId}`,
        name: input.name,
        quantity: input.quantity ?? 1,
        addedBy: { id: "pending", name: "" },
        checkedAt: null,
        checkedBy: null,
        createdAt: now,
        updatedAt: now,
      };
      queryClient.setQueryData<ShoppingListResponse>(queryKeys.shoppingList.list(), (current) => ({
        items: sortShoppingListItems([...(current?.items ?? []), optimisticItem]),
      }));
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.shoppingList.list(), context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.list() });
    },
  });
}

interface UpdateItemInput {
  itemId: string;
  name?: string;
  quantity?: number;
  checked?: boolean;
}

/** Updates name/quantity/checked, optimistically re-sorting the cache. */
export function useUpdateShoppingListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: OFFLINE_MUTATION_KEYS.shoppingItemUpdate,
    retry: offlineMutationRetry,
    mutationFn: ({ itemId, ...body }: UpdateItemInput) =>
      apiFetch<{ item: ShoppingListItem }>(`/api/shopping-list/${itemId}`, { method: "PATCH", body }),
    onMutate: async ({ itemId, ...patch }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shoppingList.list() });
      const previous = queryClient.getQueryData<ShoppingListResponse>(queryKeys.shoppingList.list());
      queryClient.setQueryData<ShoppingListResponse>(queryKeys.shoppingList.list(), (current) => {
        if (!current) return current;
        const items = current.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                ...(patch.name !== undefined ? { name: patch.name } : {}),
                ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
                ...(patch.checked !== undefined ? { checkedAt: patch.checked ? new Date().toISOString() : null } : {}),
              }
            : item,
        );
        return { items: sortShoppingListItems(items) };
      });
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.shoppingList.list(), context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.list() });
    },
  });
}

/** Removes an item from the cache immediately (used with the deferred-delete snackbar). */
export function useDeleteShoppingListItem() {
  const queryClient = useQueryClient();

  const removeFromCache = useCallback(
    (itemId: string): ShoppingListResponse | undefined => {
      const previous = queryClient.getQueryData<ShoppingListResponse>(queryKeys.shoppingList.list());
      queryClient.setQueryData<ShoppingListResponse>(queryKeys.shoppingList.list(), (current) =>
        current ? { items: current.items.filter((item) => item.id !== itemId) } : current,
      );
      return previous;
    },
    [queryClient],
  );

  const restoreToCache = useCallback(
    (previous: ShoppingListResponse | undefined) => {
      if (previous) queryClient.setQueryData(queryKeys.shoppingList.list(), previous);
    },
    [queryClient],
  );

  const mutation = useMutation({
    mutationFn: (itemId: string) => apiFetch<void>(`/api/shopping-list/${itemId}`, { method: "DELETE" }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.list() });
    },
  });

  return { ...mutation, removeFromCache, restoreToCache };
}

/** "Borrar tachados" — deletes every checked item. */
export function useClearCheckedShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiFetch<{ deletedCount: number }>("/api/shopping-list/clear-checked", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.list() });
    },
  });
}
