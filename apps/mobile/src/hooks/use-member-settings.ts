import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import type { AvailabilityGrid } from "@habita/domain";

export interface MemberSettings {
  id: string;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  availability: AvailabilityGrid | null;
}

interface MemberMeResponse {
  member: MemberSettings | null;
}

const memberSettingsKey = ["member-settings"] as const;

export function useMemberSettings() {
  return useQuery({
    queryKey: memberSettingsKey,
    queryFn: async () => mobileApi.get<MemberMeResponse>("/api/members/me"),
  });
}

export interface UpdateMemberSettingsInput {
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
  availability?: AvailabilityGrid | null;
}

/** PATCH /api/members/me — optimistic (pattern A), rolled back on error. */
export function useUpdateMemberSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMemberSettingsInput) =>
      mobileApi.patch<MemberMeResponse>("/api/members/me", input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: memberSettingsKey });
      const previous = queryClient.getQueryData<MemberMeResponse>(memberSettingsKey);

      queryClient.setQueryData<MemberMeResponse>(memberSettingsKey, (old) =>
        old?.member ? { member: { ...old.member, ...input } } : old,
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(memberSettingsKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: memberSettingsKey });
    },
  });
}
