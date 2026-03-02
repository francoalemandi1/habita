import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import type {
  TransferAction,
  TransferResponse,
  TransfersResponse,
} from "@habita/contracts";

const TRANSFERS_KEY = ["mobile", "transfers"] as const;

export function useTransfers(type?: "sent" | "received") {
  const typeQuery = type ? `?type=${type}` : "";

  return useQuery({
    queryKey: [...TRANSFERS_KEY, type ?? "all"] as const,
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
      await queryClient.invalidateQueries({ queryKey: TRANSFERS_KEY });
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
      await queryClient.invalidateQueries({ queryKey: TRANSFERS_KEY });
    },
  });
}
