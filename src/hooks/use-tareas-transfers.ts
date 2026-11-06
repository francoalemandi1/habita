"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@habita/contracts";

export interface TareasTransfer {
  id: string;
  assignmentId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  toMember: { id: string; name: string };
  assignment: { id: string };
}

interface TransfersListResponse {
  transfers: TareasTransfer[];
}

/** Transfers the current member sent — used to show "Pedido a Tomi" on a task card. */
export function useSentTransfers() {
  return useQuery({
    queryKey: queryKeys.transfers.list("sent"),
    queryFn: () => apiFetch<TransfersListResponse>("/api/transfers?type=sent"),
  });
}

export function useRequestTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { assignmentId: string; toMemberId: string; reason?: string }) =>
      apiFetch("/api/transfers", { method: "POST", body: input }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all() }),
  });
}
