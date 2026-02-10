import { z } from "zod";

export const taskFrequencySchema = z.enum([
  "DAILY",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "ONCE",
]);

export const createTaskSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  description: z
    .string()
    .max(500, "La descripción no puede exceder 500 caracteres")
    .optional(),
  frequency: taskFrequencySchema.default("WEEKLY"),
  weight: z
    .number()
    .int()
    .min(1, "El peso mínimo es 1")
    .max(5, "El peso máximo es 5")
    .default(1),
  minAge: z.number().int().min(0).max(100).nullable().optional(),
  estimatedMinutes: z.number().int().min(1).max(480).nullable().optional(),
  isRouletteEligible: z.boolean().optional().default(false),
});

export const updateTaskSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .optional(),
  description: z
    .string()
    .max(500, "La descripción no puede exceder 500 caracteres")
    .nullable()
    .optional(),
  frequency: taskFrequencySchema.optional(),
  weight: z
    .number()
    .int()
    .min(1, "El peso mínimo es 1")
    .max(5, "El peso máximo es 5")
    .optional(),
  minAge: z.number().int().min(0).max(100).nullable().optional(),
  estimatedMinutes: z.number().int().min(1).max(480).nullable().optional(),
  isActive: z.boolean().optional(),
  isRouletteEligible: z.boolean().optional(),
});

export type TaskFrequency = z.infer<typeof taskFrequencySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
