import { z } from "zod";
import { generateStructured } from "@/lib/ai/generate";

const planNotesSchema = z.object({
  notes: z.array(z.string()).min(1).max(3),
});

export interface PlanNotesInput {
  assignments: Array<{ taskName: string; memberName: string; reason: string }>;
  balanceScore: number;
}

/**
 * Short-lived LLM call that writes 1-3 "why" notes for an already-decided deterministic
 * plan. The deterministic engine owns every assignment decision; this only adds color.
 * Callers must treat any failure (including timeout) as "use template notes instead".
 */
export async function generatePlanNotes(input: PlanNotesInput): Promise<string[]> {
  const summary = input.assignments
    .slice(0, 20)
    .map((a) => `- ${a.taskName} → ${a.memberName} (${a.reason})`)
    .join("\n");

  const result = await generateStructured({
    task: "weekly-plan-notes",
    schema: planNotesSchema,
    prompt: `Resumen de un plan semanal de tareas del hogar (equidad ${input.balanceScore}/100):\n${summary}\n\nEscribí entre 1 y 3 notas breves en español rioplatense (voseo, sin "!") destacando algo útil del plan (equidad, rotación, carga). No repitas literalmente la lista de tareas.`,
    timeoutMs: 8000,
  });

  return result.notes;
}
