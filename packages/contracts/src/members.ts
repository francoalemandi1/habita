import { z } from "zod";

export const memberTypeSchema = z.enum(["ADULT", "TEEN", "CHILD"]);

export const householdMemberSummarySchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  householdId: z.string(),
  name: z.string(),
  memberType: memberTypeSchema,
  isActive: z.boolean(),
});

export const membersListResponseSchema = z.object({
  members: z.array(householdMemberSummarySchema),
});

export type MemberType = z.infer<typeof memberTypeSchema>;
export type MemberSummary = z.infer<typeof householdMemberSummarySchema>;
export type MembersListResponse = z.infer<typeof membersListResponseSchema>;
