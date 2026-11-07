import { useMutation } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

export interface LeaveHouseholdResponse {
  nextHouseholdId: string | null;
}

/** POST /api/members/me/leave — pattern D, confirmed by typing the household name. */
export function useLeaveHousehold() {
  return useMutation({
    mutationFn: async () => mobileApi.post<LeaveHouseholdResponse>("/api/members/me/leave"),
  });
}
