import { z } from "zod";

export const planAssignmentLiteSchema = z.object({
  memberName: z.string(),
});

export type PlanAssignmentLite = z.infer<typeof planAssignmentLiteSchema>;

/** `WeeklyPlan.assignments` is a Json column — validate each entry instead of casting it. */
export function parsePlanAssignments(raw: unknown): PlanAssignmentLite[] {
  const arrayResult = z.array(z.unknown()).safeParse(raw);
  if (!arrayResult.success) return [];

  const assignments: PlanAssignmentLite[] = [];
  for (const entry of arrayResult.data) {
    const entryResult = planAssignmentLiteSchema.safeParse(entry);
    if (entryResult.success) {
      assignments.push(entryResult.data);
    } else {
      console.warn("Skipping invalid plan assignment entry", entryResult.error.issues);
    }
  }
  return assignments;
}
