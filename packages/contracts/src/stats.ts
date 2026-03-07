import { z } from "zod";

export const statsMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  memberType: z.string(),
  weeklyTasks: z.number().int().nonnegative(),
  weeklyPoints: z.number().int().nonnegative(),
  monthlyTasks: z.number().int().nonnegative(),
  totalTasks: z.number().int().nonnegative(),
});

export const statsResponseSchema = z.object({
  memberStats: z.array(statsMemberSchema),
  totals: z.object({
    completed: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    members: z.number().int().nonnegative(),
  }),
  householdStreak: z.number().int().nonnegative(),
});

export type StatsResponse = z.infer<typeof statsResponseSchema>;
