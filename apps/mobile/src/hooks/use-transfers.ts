import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type {
  TransferAction,
  TransferResponse,
  TransfersResponse,
} from "@habita/contracts";

export function useTransfers(type?: "sent" | "received") {
  const typeQuery = type ? `?type=${type}` : "";

  return useQuery({
    queryKey: queryKeys.transfers.list(type),
    queryFn: async () => mobileApi.get<TransfersResponse>(`/api/transfers${typeQuery}`),
  });
}

interface CreateTransferInput {
  assignmentId: string;
  toMemberId: string;
  reason?: string;
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransferInput) =>
      mobileApi.post<TransferResponse>("/api/transfers", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all() });
    },
  });
}

export function useRespondTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { transferId: string; action: TransferAction }) =>
      mobileApi.patch<TransferResponse>(`/api/transfers/${input.transferId}`, {
        action: input.action,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all() });
    },
  });
}
