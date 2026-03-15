import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";
import { getMobileErrorMessage } from "@/lib/mobile-error";

import { queryKeys } from "@habita/contracts";
import type { CreateHouseholdInput, HouseholdResponse, JoinHouseholdInput, JoinHouseholdResponse } from "@habita/contracts";

interface HouseholdDetailResponse {
  household: {
    id: string;
    name: string;
    inviteCode: string;
    location: string | null;
    onboardingProfile?: unknown;
  } | null;
}

export function useHouseholdDetail() {
  return useQuery({
    queryKey: queryKeys.households.all(),
    queryFn: async () => mobileApi.get<HouseholdDetailResponse>("/api/households"),
  });
}

export function useUpdateHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      return mobileApi.patch<{ household: unknown }>("/api/households", input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.households.all() });
    },
  });
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateHouseholdInput) => {
      return mobileApi.post<HouseholdResponse>("/api/households/onboarding", input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
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
      void queryClient.invalidateQueries();
    },
    onError: (error: unknown) => {
      throw new Error(getMobileErrorMessage(error));
    },
  });
}
