import { z } from "zod";

export const briefingResponseSchema = z.object({
  summary: z.array(z.string()).max(3).optional(),
  lines: z.array(z.string()).max(3).optional(),
  greeting: z.string().optional(),
});

export type BriefingResponse = z.infer<typeof briefingResponseSchema>;
