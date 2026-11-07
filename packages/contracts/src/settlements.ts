import { z } from "zod";
import { expenseBalancesResponseSchema } from "./expenses";

export const settlementTransferSchema = z
  .object({
    fromMemberId: z.string().min(1),
    toMemberId: z.string().min(1),
    amount: z.number().positive().multipleOf(0.01).max(99_999_999),
    currency: z.string().min(1).max(10),
  })
  .refine((data) => data.fromMemberId !== data.toMemberId, {
    message: "Los miembros de la transferencia deben ser distintos",
    path: ["toMemberId"],
  });

export const createSettlementsSchema = z.object({
  transfers: z.array(settlementTransferSchema).min(1).max(20),
  // No ":" — the server stores one row per transfer as "<key>:<index>" and
  // replays by prefix, so a ":" in the key could match another request's rows.
  idempotencyKey: z.string().min(8).max(100).regex(/^[^:]+$/),
  note: z.string().max(200).optional(),
});

export const serializedSettlementSchema = z.object({
  id: z.string(),
  fromMemberId: z.string(),
  fromMemberName: z.string(),
  toMemberId: z.string(),
  toMemberName: z.string(),
  amount: z.number(),
  currency: z.string(),
  settledAt: z.string(),
  createdById: z.string(),
  createdByName: z.string(),
  note: z.string().nullable(),
});

export const createSettlementsResponseSchema = z.object({
  settlements: z.array(serializedSettlementSchema),
  balances: expenseBalancesResponseSchema,
});

export const settlementsListResponseSchema = z.object({
  settlements: z.array(serializedSettlementSchema),
  nextCursor: z.string().nullable(),
});

export type SettlementTransfer = z.infer<typeof settlementTransferSchema>;
export type CreateSettlementsInput = z.infer<typeof createSettlementsSchema>;
export type SerializedSettlement = z.infer<typeof serializedSettlementSchema>;
export type CreateSettlementsResponse = z.infer<typeof createSettlementsResponseSchema>;
export type SettlementsListResponse = z.infer<typeof settlementsListResponseSchema>;
