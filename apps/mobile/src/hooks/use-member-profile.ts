import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface UpdateMemberPayload {
  name?: string;
  memberType?: "ADULT" | "TEEN" | "CHILD";
}

export interface MemberDetail {
  id: string;
  name: string;
  memberType: string;
  isActive: boolean;
  avatarUrl: string | null;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, payload }: { memberId: string; payload: UpdateMemberPayload }) =>
      mobileApi.patch<{ member: MemberDetail }>(`/api/members/${memberId}`, payload),
    onSuccess: async () => {
      // Invalidate auth me to reflect name change everywhere
      await queryClient.invalidateQueries({ queryKey: ["mobile"] });
    },
  });
}
