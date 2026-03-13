import { z } from "zod";

const onboardingTaskSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  frequency: z.string(),
  weight: z.number().min(1).max(5).optional(),
  estimatedMinutes: z.number().min(1).optional(),
});

export const createHouseholdInputSchema = z.object({
  householdName: z.string().min(1).max(100),
  memberName: z.string().min(1).max(100),
  memberType: z.enum(["ADULT", "TEEN", "CHILD"]).default("ADULT"),
  location: z.object({
    city: z.string().max(100).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    timezone: z.string().max(100).optional(),
    country: z.string().max(10).optional(),
  }).optional(),
  tasks: z.array(onboardingTaskSchema).optional(),
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
