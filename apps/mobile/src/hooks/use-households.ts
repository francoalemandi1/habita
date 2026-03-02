import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";
import { getMobileErrorMessage } from "@/lib/mobile-error";

import type { CreateHouseholdInput, HouseholdResponse, JoinHouseholdInput, JoinHouseholdResponse } from "@habita/contracts";

export function useCreateHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateHouseholdInput) => {
      return mobileApi.post<HouseholdResponse>("/api/households/onboarding", input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mobile"] });
    },
    onError: (error: unknown) => {
      throw new Error(getMobileErrorMessage(error));
    },
  });
}

export function useJoinHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: JoinHouseholdInput) => {
      return mobileApi.post<JoinHouseholdResponse>("/api/households/join", input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mobile"] });
    },
    onError: (error: unknown) => {
      throw new Error(getMobileErrorMessage(error));
    },
  });
}
