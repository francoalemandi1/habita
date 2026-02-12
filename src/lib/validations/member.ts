import { z } from "zod";

export const memberTypeSchema = z.enum(["ADULT", "TEEN", "CHILD"]);

export const createMemberSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder 50 caracteres"),
  memberType: memberTypeSchema.default("ADULT"),
});

export const updateMemberSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder 50 caracteres")
    .optional(),
  memberType: memberTypeSchema.optional(),
  avatarUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const timeSlotSchema = z.enum(["MORNING", "AFTERNOON", "NIGHT"]);

export const availabilitySlotsSchema = z.object({
  weekday: z.array(timeSlotSchema).max(3),
  weekend: z.array(timeSlotSchema).max(3),
  notes: z.string().max(300).optional(),
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type AvailabilitySlots = z.infer<typeof availabilitySlotsSchema>;
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
