import { z } from "zod";

export const createNoteSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().max(2000).optional(),
  isPinned: z.boolean().default(false),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().max(2000).nullable().optional(),
  isPinned: z.boolean().optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
