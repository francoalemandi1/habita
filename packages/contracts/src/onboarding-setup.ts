import { z } from "zod";
import { taskFrequencySchema } from "./tasks";

// ─── Input ───────────────────────────────────────────────────────────────────

export const onboardingSetupInputSchema = z.object({
  householdDescription: z.string().min(1).max(2000),
  isSoloMode: z.boolean(),
  memberName: z.string().max(50).optional(),
});

export type OnboardingSetupInput = z.infer<typeof onboardingSetupInputSchema>;

// ─── LLM output (structured) ────────────────────────────────────────────────

export const onboardingSetupTaskSchema = z.object({
  name: z.string(),
  frequency: taskFrequencySchema,
  weight: z.number().int().min(1).max(5),
  estimatedMinutes: z.number().int().min(1).max(480),
  reason: z.string().optional(),
});

export const onboardingHouseholdProfileSchema = z.object({
  city: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  planningDay: z.number().int().min(0).max(6).nullable().optional(),
  occupationLevel: z.enum(["BUSY", "MODERATE", "AVAILABLE"]).optional(),
  suggestedHouseholdName: z.string().nullable().optional(),
});

export const onboardingSetupResponseSchema = z.object({
  tasks: z.array(onboardingSetupTaskSchema),
  householdProfile: onboardingHouseholdProfileSchema,
  insights: z.array(z.string()),
  dietaryHints: z.array(z.string()),
  shoppingContext: z.array(z.string()),
});

export type OnboardingSetupTask = z.infer<typeof onboardingSetupTaskSchema>;
export type OnboardingHouseholdProfile = z.infer<typeof onboardingHouseholdProfileSchema>;
export type OnboardingSetupResponse = z.infer<typeof onboardingSetupResponseSchema>;
