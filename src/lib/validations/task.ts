import { z } from "zod";

export const taskFrequencySchema = z.enum([
  "DAILY",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "ONCE",
]);

export const initialAssignmentSchema = z.object({
  memberId: z.string().min(1).nullable(),
  dueDate: z.coerce.date(),
});

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
  isRotating: z.boolean().optional(),
  // Same rule as settlements: no ":" so the key never collides with a prefix match elsewhere.
  idempotencyKey: z.string().min(8).max(100).regex(/^[^:]+$/).optional(),
  initialAssignment: initialAssignmentSchema.optional(),
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
  isRotating: z.boolean().optional(),
});

export type TaskFrequency = z.infer<typeof taskFrequencySchema>;
export type InitialAssignmentInput = z.infer<typeof initialAssignmentSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
