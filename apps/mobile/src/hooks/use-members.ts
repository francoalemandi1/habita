import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type { MembersListResponse } from "@habita/contracts";

export function useMembers() {
  return useQuery({
    queryKey: queryKeys.members.all(),
    queryFn: async () => mobileApi.get<MembersListResponse>("/api/members"),
  });
}
