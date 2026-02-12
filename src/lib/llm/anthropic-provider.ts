import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, generateObject, streamText } from "ai";
import { z } from "zod";

import type { LLMProvider } from "./types";
import { DEFAULT_LLM_TIMEOUT_MS } from "./types";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL_VARIANTS = {
  fast: "claude-3-5-haiku-latest",
  standard: "claude-3-5-sonnet-latest",
  powerful: "claude-3-5-sonnet-latest",
} as const;

/**
 * Anthropic Claude provider implementation.
 * Uses Vercel AI SDK for structured outputs and streaming.
 */
export const anthropicProvider: LLMProvider = {
  async completeWithSchema<T>(options: {
    prompt: string;
    outputSchema: object;
    modelVariant?: "fast" | "standard" | "powerful";
    timeoutMs?: number;
  }): Promise<T> {
    const model = anthropic(MODEL_VARIANTS[options.modelVariant ?? "standard"]);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS);

    try {
      const result = await generateText({
        model,
        prompt: options.prompt,
        abortSignal: controller.signal,
      });

      try {
        return JSON.parse(result.text) as T;
      } catch {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as T;
        }
        throw new Error("Failed to parse LLM response as JSON");
      }
    } finally {
      clearTimeout(timer);
    }
  },
};

/**
 * Generate suggested tasks using structured output.
 */
export async function generateSuggestedTasks(householdDescription: string) {
  const model = anthropic(MODEL_VARIANTS.fast);

  const taskSchema = z.object({
    tasks: z.array(
      z.object({
        name: z.string().describe("Nombre claro y conciso de la tarea"),
        frequency: z
          .enum(["daily", "weekly", "biweekly", "monthly"])
          .describe("Frecuencia de la tarea"),
        category: z
          .enum(["cleaning", "kitchen", "laundry", "rooms", "exterior", "pets", "other"])
          .optional()
          .describe("Categoría de la tarea"),
      })
    ),
  });

  const result = await generateObject({
    model,
    schema: taskSchema,
    prompt: `Eres un experto en organización del hogar. A partir de la siguiente descripción, genera entre 5 y 10 tareas recurrentes adecuadas.

Descripción del hogar:
${householdDescription}

Considera:
- Tipo de vivienda (apartamento, casa, etc.)
- Número de personas
- Si hay niños o adolescentes
- Si hay mascotas
- Si hay jardín o espacios exteriores

Genera tareas que:
- Sean recurrentes (no puntuales)
- Sean claras y concisas
- Tengan frecuencia apropiada
- Sean relevantes para el contexto descrito`,
  });

  return result.object;
}

/**
 * Stream a chat response for the AI assistant.
 */
export async function streamAssistantResponse(options: {
  systemPrompt: string;
  userMessage: string;
  context: string;
}) {
  const model = anthropic(MODEL_VARIANTS.standard);

  const result = streamText({
    model,
    system: options.systemPrompt,
    prompt: `${options.context}\n\nPregunta del usuario: ${options.userMessage}`,
  });

  return result;
}

/**
 * Generate a weekly plan recommendation.
 */
export async function generateWeeklyPlan(options: {
  members: Array<{ name: string; type: string; pendingTasks: number }>;
  tasks: Array<{ name: string; frequency: string; weight: number }>;
  recentAssignments: Array<{ taskName: string; memberName: string; completedAt?: Date }>;
}) {
  const model = anthropic(MODEL_VARIANTS.standard);

  const planSchema = z.object({
    recommendations: z.array(
      z.object({
        taskName: z.string(),
        suggestedMember: z.string(),
        reason: z.string().describe("Breve explicación de por qué"),
        priority: z.enum(["high", "medium", "low"]),
      })
    ),
    insights: z.array(z.string()).describe("Observaciones sobre equidad y distribución"),
  });

  const result = await generateObject({
    model,
    schema: planSchema,
    prompt: `Analiza la situación del hogar y genera recomendaciones de asignación.

Miembros:
${options.members.map((m) => `- ${m.name} (${m.type}): ${m.pendingTasks} tareas pendientes`).join("\n")}

Tareas disponibles:
${options.tasks.map((t) => `- ${t.name} (${t.frequency}, peso ${t.weight})`).join("\n")}

Asignaciones recientes:
${options.recentAssignments.map((a) => `- ${a.taskName} -> ${a.memberName}${a.completedAt ? " (completada)" : ""}`).join("\n")}

Genera recomendaciones considerando:
1. Equidad en la distribución
2. Capacidad de cada tipo de miembro (adulto 100%, teen 60%, child 30%)
3. Quién no ha hecho ciertas tareas recientemente
4. Carga actual de cada miembro`,
  });

  return result.object;
}
