"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { queryKeys, membersListResponseSchema } from "@habita/contracts";

import type { MemberSummary } from "@habita/contracts";

const currentMemberResponseSchema = z.object({
  member: z.object({ id: z.string(), name: z.string() }).nullable(),
});

/** Household members + current member id, for the globally-mounted Anotar sheet. */
export function useAnotarHousehold(): {
  members: MemberSummary[];
  currentMemberId: string | null;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
} {
  const membersQuery = useQuery({
    queryKey: queryKeys.members.all(),
    queryFn: async () => {
      const raw = await apiFetch<unknown>("/api/members");
      const parsed = membersListResponseSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn("useAnotarHousehold: invalid /api/members response", parsed.error);
        return { members: [] };
      }
      return parsed.data;
    },
  });

  const meQuery = useQuery({
    queryKey: [...queryKeys.members.all(), "me"],
    queryFn: async () => {
      const raw = await apiFetch<unknown>("/api/members/me");
      const parsed = currentMemberResponseSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn("useAnotarHousehold: invalid /api/members/me response", parsed.error);
        return { member: null };
      }
      return parsed.data;
    },
  });

  function retry(): void {
    void membersQuery.refetch();
    void meQuery.refetch();
  }

  return {
    members: membersQuery.data?.members ?? [],
    currentMemberId: meQuery.data?.member?.id ?? null,
    isLoading: membersQuery.isLoading || meQuery.isLoading,
    isError: membersQuery.isError || meQuery.isError,
    retry,
  };
}
