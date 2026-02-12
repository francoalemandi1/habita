import { z } from "zod";

import { availabilitySlotsSchema } from "./member";

const taskFrequencySchema = z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]);
const memberTypeSchema = z.enum(["adult", "teen", "child"]);

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

export const createHouseholdWithTasksSchema = z.object({
  householdName: z.string().min(1, "El nombre del hogar es requerido").max(50),
  memberName: z.string().max(50).optional(),
  memberType: memberTypeSchema.optional(),
  tasks: z.array(onboardingTaskSchema).min(1, "Selecciona al menos una tarea"),
  availabilitySlots: availabilitySlotsSchema.optional(),
  location: householdLocationSchema.optional(),
});

export const joinHouseholdOnboardingSchema = z.object({
  inviteCode: z.string().min(1, "El código es requerido").max(8),
  memberName: z.string().min(1, "Tu nombre es requerido").max(50),
  memberType: memberTypeSchema.optional(),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type JoinHouseholdInput = z.infer<typeof joinHouseholdSchema>;
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;
export type CreateHouseholdWithTasksInput = z.infer<
  typeof createHouseholdWithTasksSchema
>;
export type JoinHouseholdOnboardingInput = z.infer<
  typeof joinHouseholdOnboardingSchema
>;
