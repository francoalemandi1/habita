import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { mobileApi } from "@/lib/api";
import { getHouseholdWeekRange } from "@/lib/casa-week";

import { assignmentSummarySchema, queryKeys } from "@habita/contracts";

const WEEK_ASSIGNMENTS_LIMIT = 100;

const weekAssignmentsResponseSchema = z.object({
  assignments: z.array(assignmentSummarySchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

/** All household assignments due this week (Mon–Sun), for the Casa board's `SplitBar`. */
export function useWeekAssignments(now: Date) {
  const { from, to } = getHouseholdWeekRange(now);

  return useQuery({
    queryKey: [...queryKeys.assignments.all(), "week", from, to],
    queryFn: async () => {
      const raw = await mobileApi.get<unknown>(
        `/api/assignments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=${WEEK_ASSIGNMENTS_LIMIT}`,
      );
      const parsed = weekAssignmentsResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error("Respuesta de tareas de la semana inválida");
      }
      return parsed.data.assignments;
    },
  });
}
