"use client";

import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSettlementsSchema,
  expenseBalancesResponseSchema,
  settlementsListResponseSchema,
  createSettlementsResponseSchema,
} from "@habita/contracts";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type {
  CreateSettlementsResponse,
  ExpenseBalancesResponse,
  SettlementTransfer,
  SettlementsListResponse,
} from "@habita/contracts";

const settlementsKey = {
  all: () => ["settlements"] as const,
  history: () => [...settlementsKey.all(), "history"] as const,
};

const SETTLEMENT_HISTORY_PAGE_SIZE = 20;

export function useBalances() {
  return useQuery({
    queryKey: queryKeys.expenses.balances(),
    queryFn: async () =>
      expenseBalancesResponseSchema.parse(await apiFetch<ExpenseBalancesResponse>("/api/expenses/balances")),
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
        await apiFetch<SettlementsListResponse>(`/api/settlements?${qs.toString()}`),
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/**
 * Pattern C mutation for "Liquidar saldos". `sheetOpen` regenerates the
 * idempotency key each time the sheet transitions closed → open, and the
 * same key is reused across retries within that open session so a retried
 * confirm after a failed attempt cannot double-record the transfers.
 */
export function useSettleUp(sheetOpen: boolean) {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const wasOpenRef = useRef(sheetOpen);

  useEffect(() => {
    if (sheetOpen && !wasOpenRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
    wasOpenRef.current = sheetOpen;
  }, [sheetOpen]);

  return useMutation({
    mutationFn: async (input: { transfers: SettlementTransfer[]; note?: string }) => {
      const body = createSettlementsSchema.parse({
        transfers: input.transfers,
        idempotencyKey: idempotencyKeyRef.current,
        note: input.note,
      });
      return createSettlementsResponseSchema.parse(
        await apiFetch<CreateSettlementsResponse>("/api/settlements", { method: "POST", body }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() });
      queryClient.invalidateQueries({ queryKey: settlementsKey.all() });
    },
  });
}

/** Respects §8.3 "reduced motion → 120ms fundido" by reporting whether tweens should be skipped. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}
