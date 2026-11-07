import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

export interface Absence {
  id: string;
  memberId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}

interface AbsencesResponse {
  absences: Absence[];
  current: Absence[];
  upcoming: Absence[];
  isCurrentlyAbsent: boolean;
}

const absencesKey = ["absences"] as const;

export function useAbsences() {
  return useQuery({
    queryKey: absencesKey,
    queryFn: async () => mobileApi.get<AbsencesResponse>("/api/absences"),
  });
}

export interface CreateAbsenceInput {
  startDate: string;
  endDate: string;
  reason?: string;
}

export function useCreateAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAbsenceInput) =>
      mobileApi.post<{ absence: Absence }>("/api/absences", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: absencesKey });
    },
  });
}

export function useDeleteAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (absenceId: string) => mobileApi.delete(`/api/absences/${absenceId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: absencesKey });
    },
  });
}
