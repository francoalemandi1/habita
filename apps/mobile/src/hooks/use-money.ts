import { useEffect, useRef } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSettlementsSchema,
  expenseBalancesResponseSchema,
  settlementsListResponseSchema,
  createSettlementsResponseSchema,
} from "@habita/contracts";
import { mobileApi } from "@/lib/api";
import { queryKeys } from "@habita/contracts";

import type {
  CreateSettlementsResponse,
  ExpenseBalancesResponse,
  SettlementTransfer,
  SettlementsListResponse,
} from "@habita/contracts";
import { createUniqueId } from "@/lib/unique-id";

// No settlements query key exists yet in @habita/contracts — local constant until one is added there.
const settlementsKey = {
  all: () => ["settlements"] as const,
  history: () => [...settlementsKey.all(), "history"] as const,
};

const SETTLEMENT_HISTORY_PAGE_SIZE = 20;

export function useBalances() {
  return useQuery({
    queryKey: queryKeys.expenses.balances(),
    queryFn: async () =>
      expenseBalancesResponseSchema.parse(await mobileApi.get<ExpenseBalancesResponse>("/api/expenses/balances")),
    staleTime: 30_000,
  });
}

export function useSettlementHistory() {
  return useInfiniteQuery({
    queryKey: settlementsKey.history(),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const qs = new URLSearchParams({ limit: String(SETTLEMENT_HISTORY_PAGE_SIZE) });
      if (pageParam) qs.set("cursor", pageParam);
      return settlementsListResponseSchema.parse(
        await mobileApi.get<SettlementsListResponse>(`/api/settlements?${qs.toString()}`),
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/**
 * Pattern C mutation for "Liquidar saldos". `sheetVisible` regenerates the
 * idempotency key each time the sheet transitions closed → open, and the
 * same key is reused across retries within that open session so a retried
 * confirm after a failed attempt cannot double-record the transfers.
 */
export function useSettleUp(sheetVisible: boolean) {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string>(createUniqueId());
  const wasVisibleRef = useRef(sheetVisible);

  useEffect(() => {
    if (sheetVisible && !wasVisibleRef.current) {
      idempotencyKeyRef.current = createUniqueId();
    }
    wasVisibleRef.current = sheetVisible;
  }, [sheetVisible]);

  return useMutation({
    mutationFn: async (input: { transfers: SettlementTransfer[]; note?: string }) => {
      const body = createSettlementsSchema.parse({
        transfers: input.transfers,
        idempotencyKey: idempotencyKeyRef.current,
        note: input.note,
      });
      return createSettlementsResponseSchema.parse(
        await mobileApi.post<CreateSettlementsResponse>("/api/settlements", body),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() });
      await queryClient.invalidateQueries({ queryKey: settlementsKey.all() });
    },
  });
}

/**
 * §7 "Sin conexión": C actions disable with "Necesitás conexión".
 * `@react-native-community/netinfo` is not installed in this app, so until it
 * is added we can't detect real connectivity and always report online.
 */
export function useIsOnline(): boolean {
  return true;
}
