import { z } from "zod";

const taskFrequencySchema = z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]);
const memberTypeSchema = z.enum(["adult", "teen", "child"]);
const occupationLevelSchema = z.enum(["BUSY", "MODERATE", "AVAILABLE"]);

export const householdLocationSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().max(100).optional(),
  country: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
});

export type HouseholdLocationInput = z.infer<typeof householdLocationSchema>;

export const createHouseholdSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder 50 caracteres"),
});

export const joinHouseholdSchema = z.object({
  inviteCode: z
    .string()
    .min(1, "El código de invitación es requerido")
    .max(50, "Código de invitación inválido"),
});

export const joinHouseholdWithMemberSchema = z.object({
  inviteCode: z.string().min(1, "El código es requerido").max(50),
  memberName: z.string().max(50).optional(),
  memberType: memberTypeSchema.optional(),
  occupationLevel: occupationLevelSchema.optional(),
});

export const updateHouseholdSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder 50 caracteres")
    .optional(),
  location: householdLocationSchema.optional(),
  planningDay: z.number().int().min(0).max(6).nullable().optional(),
});

export const onboardingTaskSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  frequency: taskFrequencySchema,
  weight: z.number().min(1).max(5).optional(),
  estimatedMinutes: z.number().min(1).optional(),
});

export const createHouseholdOnboardingSchema = z.object({
  householdName: z.string().min(1, "El nombre del hogar es requerido").max(50),
  memberName: z.string().max(50).optional(),
  memberType: memberTypeSchema.optional(),
  tasks: z.array(onboardingTaskSchema).optional().default([]),
  location: householdLocationSchema.optional(),
  planningDay: z.number().int().min(0).max(6).nullable().optional(),
  occupationLevel: occupationLevelSchema.optional(),
  onboardingProfile: z.object({
    dietaryHints: z.array(z.string().max(100)).max(10).default([]),
    shoppingContext: z.array(z.string().max(200)).max(10).default([]),
    insights: z.array(z.string().max(500)).max(5).default([]),
    rawDescription: z.string().max(2000).nullable().default(null),
    taskReasons: z.array(z.object({
      taskName: z.string().max(100),
      reason: z.string().max(200),
    })).max(20).default([]),
  }).optional(),
});

export const joinHouseholdOnboardingSchema = z.object({
  inviteCode: z.string().min(1, "El código es requerido").max(8),
  memberName: z.string().min(1, "Tu nombre es requerido").max(50),
  memberType: memberTypeSchema.optional(),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type JoinHouseholdInput = z.infer<typeof joinHouseholdSchema>;
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;
export type CreateHouseholdOnboardingInput = z.infer<
  typeof createHouseholdOnboardingSchema
>;
export type JoinHouseholdOnboardingInput = z.infer<
  typeof joinHouseholdOnboardingSchema
>;
