import { z } from "zod";

export const serializedServiceSchema = z.object({
  id: z.string(),
  title: z.string(),
  provider: z.string().nullable(),
  accountNumber: z.string().nullable(),
  lastAmount: z.number().nullable(),
  currency: z.string(),
  category: z.string(),
  splitType: z.string(),
  paidById: z.string(),
  paidBy: z.object({ id: z.string(), name: z.string() }),
  notes: z.string().nullable(),
  frequency: z.string(),
  dayOfMonth: z.number().nullable(),
  dayOfWeek: z.number().nullable(),
  autoGenerate: z.boolean(),
  nextDueDate: z.string(),
  lastGeneratedAt: z.string().nullable(),
  isActive: z.boolean(),
});

export const serializedInvoiceSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  period: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  status: z.enum(["PENDING", "PAID", "OVERDUE"]),
  pdfUrl: z.string().nullable(),
  expenseId: z.string().nullable(),
  notes: z.string().nullable(),
});

export const createServicePayloadSchema = z.object({
  title: z.string().min(1),
  provider: z.string().optional(),
  accountNumber: z.string().optional(),
  lastAmount: z.number().optional(),
  category: z.string().optional(),
  splitType: z.string().optional(),
  paidById: z.string().min(1),
  notes: z.string().optional(),
  frequency: z.string().min(1),
  dayOfMonth: z.number().optional(),
  dayOfWeek: z.number().optional(),
  autoGenerate: z.boolean().optional(),
  nextDueDate: z.string().min(1),
});

export type SerializedService = z.infer<typeof serializedServiceSchema>;
export type SerializedInvoice = z.infer<typeof serializedInvoiceSchema>;
export type CreateServicePayload = z.infer<typeof createServicePayloadSchema>;
