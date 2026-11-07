import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";
import { queryKeys } from "@habita/contracts";
import { sortShoppingListItems } from "@habita/prices";
import { OFFLINE_MUTATION_KEYS } from "@/lib/offline-mutation-keys";
import { readStringField, usePendingMutationIds } from "./use-pending-mutations";

import type { ShoppingListItem, ShoppingListResponse } from "@habita/contracts";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/** Shared household shopping list — unchecked first, checked at the end. */
export function useShoppingList() {
  return useQuery<ShoppingListResponse>({
    queryKey: queryKeys.shoppingList.list(),
    queryFn: () => mobileApi.get<ShoppingListResponse>("/api/shopping-list"),
    staleTime: FIVE_MINUTES_MS,
    refetchOnWindowFocus: true,
  });
}

export interface AddItemInput {
  name: string;
  quantity?: number;
  clientId: string;
}

/** Standalone (no React) so it can be registered via `setMutationDefaults` and survive an app restart. */
export const addShoppingListItemMutationFn = (input: AddItemInput) =>
  mobileApi.post<{ item: ShoppingListItem }>("/api/shopping-list", input);

/**
 * Adds an item, optimistically appending it to the cache under a temp id.
 * Rolls back on failure; the caller shows the error snackbar.
 */
export function useAddShoppingListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: OFFLINE_MUTATION_KEYS.addShoppingListItem,
    mutationFn: addShoppingListItemMutationFn,
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
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.shoppingList.list(), context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.list() });
    },
  });
}

export interface UpdateItemInput {
  itemId: string;
  name?: string;
  quantity?: number;
  checked?: boolean;
}

/** Standalone (no React) so it can be registered via `setMutationDefaults` and survive an app restart. */
export const updateShoppingListItemMutationFn = ({ itemId, ...body }: UpdateItemInput) =>
  mobileApi.patch<{ item: ShoppingListItem }>(`/api/shopping-list/${itemId}`, body);

/** Updates name/quantity/checked, optimistically re-sorting the cache. */
export function useUpdateShoppingListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: OFFLINE_MUTATION_KEYS.updateShoppingListItem,
    mutationFn: updateShoppingListItemMutationFn,
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
                ...(patch.checked !== undefined
                  ? { checkedAt: patch.checked ? new Date().toISOString() : null }
                  : {}),
              }
            : item,
        );
        return { items: sortShoppingListItems(items) };
      });
      return { previous };
    },
    onError: (_error, _input, context) => {
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
    mutationFn: (itemId: string) => mobileApi.delete<void>(`/api/shopping-list/${itemId}`),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.list() });
    },
  });

  return { ...mutation, removeFromCache, restoreToCache };
}

/** Item ids with a paused or in-flight add/update mutation — shown with a `PendingDot` until they sync (§7). */
export function useShoppingItemPendingIds(): Set<string> {
  const addingIds = usePendingMutationIds(OFFLINE_MUTATION_KEYS.addShoppingListItem, (variables) => {
    const clientId = readStringField(variables, "clientId");
    return clientId ? `pending-${clientId}` : null;
  });
  const updatingIds = usePendingMutationIds(OFFLINE_MUTATION_KEYS.updateShoppingListItem, (variables) =>
    readStringField(variables, "itemId"),
  );
  return new Set([...addingIds, ...updatingIds]);
}

/** "Borrar tachados" — deletes every checked item. */
export function useClearCheckedShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mobileApi.post<{ deletedCount: number }>("/api/shopping-list/clear-checked", {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.list() });
    },
  });
}
