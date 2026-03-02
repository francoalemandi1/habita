import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import type { MembersListResponse } from "@habita/contracts";

const MEMBERS_QUERY_KEY = ["mobile", "members"] as const;

export function useMembers() {
  return useQuery({
    queryKey: MEMBERS_QUERY_KEY,
    queryFn: async () => mobileApi.get<MembersListResponse>("/api/members"),
  });
}
