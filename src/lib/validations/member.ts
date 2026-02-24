import { z } from "zod";

export const memberTypeSchema = z.enum(["ADULT", "TEEN", "CHILD"]);

export const createMemberSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder 50 caracteres"),
  memberType: memberTypeSchema.default("ADULT"),
});

export const occupationLevelSchema = z.enum(["BUSY", "MODERATE", "AVAILABLE"]);

export const updateMemberSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder 50 caracteres")
    .optional(),
  memberType: memberTypeSchema.optional(),
  avatarUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  occupationLevel: occupationLevelSchema.optional(),
});

export type OccupationLevel = z.infer<typeof occupationLevelSchema>;
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
