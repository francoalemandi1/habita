import { z } from "zod";

export const createHouseholdInputSchema = z.object({
  householdName: z.string().min(1).max(100),
  memberName: z.string().min(1).max(100),
  memberType: z.enum(["ADULT", "TEEN", "CHILD"]).default("ADULT"),
  location: z.string().optional(),
});

export const joinHouseholdInputSchema = z.object({
  inviteCode: z.string().min(1),
  memberName: z.string().min(1).max(100).optional(),
  memberType: z.enum(["ADULT", "TEEN", "CHILD"]).optional(),
});

export const householdResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  inviteCode: z.string(),
  location: z.string().nullable(),
});

export const joinHouseholdResponseSchema = z.object({
  householdId: z.string(),
  householdName: z.string(),
  memberId: z.string(),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdInputSchema>;
export type JoinHouseholdInput = z.infer<typeof joinHouseholdInputSchema>;
export type HouseholdResponse = z.infer<typeof householdResponseSchema>;
export type JoinHouseholdResponse = z.infer<typeof joinHouseholdResponseSchema>;
