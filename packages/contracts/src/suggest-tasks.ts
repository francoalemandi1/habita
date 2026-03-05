import { z } from "zod";
import { taskFrequencySchema } from "./tasks";

export const suggestedTaskSchema = z.object({
  name: z.string(),
  frequency: taskFrequencySchema,
  category: z.string(),
  icon: z.string(),
  estimatedMinutes: z.number(),
  weight: z.number(),
  reason: z.string().optional(),
});

export const taskCategoryGroupSchema = z.object({
  name: z.string(),
  label: z.string(),
  icon: z.string(),
  tasks: z.array(suggestedTaskSchema),
});

export const suggestTasksResponseSchema = z.object({
  categories: z.array(taskCategoryGroupSchema),
  insights: z.array(z.string()),
});

export const suggestTasksInputSchema = z.object({
  hasChildren: z.boolean().optional(),
  hasPets: z.boolean().optional(),
  location: z.string().optional(),
  householdDescription: z.string().optional(),
});

export type SuggestedTask = z.infer<typeof suggestedTaskSchema>;
export type TaskCategoryGroup = z.infer<typeof taskCategoryGroupSchema>;
export type SuggestTasksResponse = z.infer<typeof suggestTasksResponseSchema>;
export type SuggestTasksInput = z.infer<typeof suggestTasksInputSchema>;
