"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface AbsenceInput {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface AbsenceRecord {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}

interface CreateAbsenceResponse {
  absence: AbsenceRecord;
}

/** §5.3 Disponibilidad → ausencias — add/remove via /api/absences. */
export function useCreateAbsence() {
  return useMutation({
    mutationFn: (input: AbsenceInput) =>
      apiFetch<CreateAbsenceResponse>("/api/absences", { method: "POST", body: input }),
  });
}

export function useDeleteAbsence() {
  return useMutation({
    mutationFn: (absenceId: string) => apiFetch(`/api/absences/${absenceId}`, { method: "DELETE" }),
  });
}
