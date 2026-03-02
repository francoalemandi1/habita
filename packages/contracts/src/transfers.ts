import { z } from "zod";

export const transferStatusSchema = z.enum(["PENDING", "ACCEPTED", "REJECTED", "EXPIRED"]);
export const transferActionSchema = z.enum(["ACCEPT", "REJECT"]);

export const transferItemSchema = z.object({
  id: z.string(),
  assignmentId: z.string(),
  fromMemberId: z.string(),
  toMemberId: z.string(),
  reason: z.string().nullable(),
  status: transferStatusSchema,
  requestedAt: z.string(),
  respondedAt: z.string().nullable(),
  assignment: z.object({
    id: z.string(),
    task: z.object({
      id: z.string(),
      name: z.string(),
    }),
  }),
  fromMember: z.object({
    id: z.string(),
    name: z.string(),
  }),
  toMember: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export const transfersResponseSchema = z.object({
  transfers: z.array(transferItemSchema),
});

export const transferResponseSchema = z.object({
  transfer: transferItemSchema,
});

export type TransferItem = z.infer<typeof transferItemSchema>;
export type TransferAction = z.infer<typeof transferActionSchema>;
export type TransfersResponse = z.infer<typeof transfersResponseSchema>;
export type TransferResponse = z.infer<typeof transferResponseSchema>;
