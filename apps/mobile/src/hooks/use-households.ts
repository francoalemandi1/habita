import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";
import { getMobileErrorMessage } from "@/lib/mobile-error";

import type { CreateHouseholdInput, HouseholdResponse, JoinHouseholdInput, JoinHouseholdResponse } from "@habita/contracts";

interface HouseholdDetailResponse {
  household: {
    id: string;
    name: string;
    inviteCode: string;
    location: string | null;
  } | null;
}

const HOUSEHOLD_QUERY_KEY = ["mobile", "household"] as const;

export function useHouseholdDetail() {
  return useQuery({
    queryKey: HOUSEHOLD_QUERY_KEY,
    queryFn: async () => mobileApi.get<HouseholdDetailResponse>("/api/households"),
  });
}

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
