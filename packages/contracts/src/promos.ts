import { z } from "zod";

export const bankPromoSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  bankSlug: z.string(),
  bankDisplayName: z.string(),
  storeName: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  discountPercent: z.number(),
  daysOfWeek: z.string(),
  paymentMethods: z.string().nullable(),
  eligiblePlans: z.string().nullable(),
  capAmount: z.number().nullable(),
  validUntil: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  createdAt: z.string(),
});

export const promoPipelineStatusSchema = z.object({
  isRunning: z.boolean(),
  startedAt: z.string().nullable(),
});

export type BankPromo = z.infer<typeof bankPromoSchema>;
export type PromoPipelineStatus = z.infer<typeof promoPipelineStatusSchema>;
