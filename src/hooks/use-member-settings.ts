"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

import type { Availability } from "@habita/contracts";

interface MemberSettingsPatch {
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
  availability?: Availability | null;
}

/** PATCH /api/members/me — shared by the quiet hours card and the availability grid. */
export function useUpdateMemberSettings() {
  return useMutation({
    mutationFn: (patch: MemberSettingsPatch) => apiFetch("/api/members/me", { method: "PATCH", body: patch }),
  });
}
