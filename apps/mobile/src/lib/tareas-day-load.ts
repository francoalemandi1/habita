/** Pure helper for the "Pasar tarea" sheet (handoff §5.3/§7): each member's load on a given day. */

export interface AssignmentLoadInput {
  memberId: string;
  dueDate: string;
}

/** Counts assignments due on `dayKey` (YYYY-MM-DD) per member. */
export function computeMemberDayLoad(assignments: readonly AssignmentLoadInput[], dayKeyValue: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const assignment of assignments) {
    if (assignment.dueDate.slice(0, 10) !== dayKeyValue) continue;
    counts[assignment.memberId] = (counts[assignment.memberId] ?? 0) + 1;
  }
  return counts;
}
