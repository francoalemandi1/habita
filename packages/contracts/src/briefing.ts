import { z } from "zod";

export const briefingResponseSchema = z.object({
  greeting: z.string().optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  suggestion: z.string().optional(),
});

export type BriefingResponse = z.infer<typeof briefingResponseSchema>;
