import { OpenRouter } from "@openrouter/sdk";

import type { LLMProvider } from "./types";
import { DEFAULT_LLM_TIMEOUT_MS } from "./types";

function getClient() {
  return new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}

// Use OpenRouter's auto-router which selects the best available model
// openrouter/auto routes to the best available model based on the request
const MODEL_VARIANTS = {
  fast: "openrouter/auto",
  standard: "openrouter/auto",
  powerful: "openrouter/auto",
} as const;

/**
 * OpenRouter provider implementation.
 * Provides access to multiple AI models through a single API.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`LLM request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export const openrouterProvider: LLMProvider = {
  async completeWithSchema<T>(options: {
    prompt: string;
    outputSchema: object;
    modelVariant?: "fast" | "standard" | "powerful";
    timeoutMs?: number;
  }): Promise<T> {
    const client = getClient();
    const model = MODEL_VARIANTS[options.modelVariant ?? "standard"];
    const timeoutMs = options.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS;

    const result = await withTimeout(
      client.chat.send({
        chatGenerationParams: {
          model,
          messages: [
            {
              role: "system",
              content: "Responde SOLO con JSON válido, sin markdown ni explicaciones adicionales.",
            },
            {
              role: "user",
              content: options.prompt,
            },
          ],
          stream: false,
        },
      }),
      timeoutMs,
    );

    const message = result.choices?.[0]?.message;
    const text = typeof message?.content === "string" ? message.content : "{}";

    try {
      return JSON.parse(text) as T;
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
      throw new Error("Failed to parse LLM response as JSON");
    }
  },
};

/**
 * Generate suggested tasks using OpenRouter.
 */
export async function generateSuggestedTasksOpenRouter(householdDescription: string) {
  const client = getClient();

  const result = await client.chat.send({
    chatGenerationParams: {
      model: MODEL_VARIANTS.fast,
      messages: [
        {
          role: "system",
          content: `Eres un experto en organización del hogar. Genera tareas recurrentes en formato JSON.
Responde SOLO con JSON válido siguiendo este schema:
{
  "tasks": [
    { "name": "string", "frequency": "daily|weekly|biweekly|monthly", "category": "cleaning|kitchen|laundry|rooms|exterior|pets|other" }
  ]
}`,
        },
        {
          role: "user",
          content: `A partir de la siguiente descripción, genera entre 5 y 10 tareas recurrentes adecuadas.

Descripción del hogar:
${householdDescription}

Considera:
- Tipo de vivienda (apartamento, casa, etc.)
- Número de personas
- Si hay niños o adolescentes
- Si hay mascotas
- Si hay jardín o espacios exteriores`,
        },
      ],
      stream: false,
    },
  });

  const message = result.choices?.[0]?.message;
  const text = typeof message?.content === "string" ? message.content : '{"tasks":[]}';

  try {
    return JSON.parse(text) as {
      tasks: Array<{
        name: string;
        frequency: "daily" | "weekly" | "biweekly" | "monthly";
        category?: string;
      }>;
    };
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as { tasks: Array<{ name: string; frequency: "daily" | "weekly" | "biweekly" | "monthly" }> };
    }
    return { tasks: [] };
  }
}

/**
 * Stream a chat response using OpenRouter.
 */
export async function streamAssistantResponseOpenRouter(options: {
  systemPrompt: string;
  userMessage: string;
  context: string;
}) {
  const client = getClient();

  const stream = await client.chat.send({
    chatGenerationParams: {
      model: MODEL_VARIANTS.standard,
      messages: [
        {
          role: "system",
          content: options.systemPrompt,
        },
        {
          role: "user",
          content: `${options.context}\n\nPregunta del usuario: ${options.userMessage}`,
        },
      ],
      stream: true,
    },
  });

  return stream;
}

/**
 * Generate a weekly plan recommendation using OpenRouter.
 */
export async function generateWeeklyPlanOpenRouter(options: {
  members: Array<{ name: string; type: string; pendingTasks: number }>;
  tasks: Array<{ name: string; frequency: string; weight: number }>;
  recentAssignments: Array<{ taskName: string; memberName: string; completedAt?: Date }>;
}) {
  const client = getClient();

  const result = await client.chat.send({
    chatGenerationParams: {
      model: MODEL_VARIANTS.standard,
      messages: [
        {
          role: "system",
          content: `Eres un planificador de tareas del hogar. Genera recomendaciones en formato JSON.
Responde SOLO con JSON válido siguiendo este schema:
{
  "recommendations": [
    { "taskName": "string", "suggestedMember": "string", "reason": "string", "priority": "high|medium|low" }
  ],
  "insights": ["string"]
}`,
        },
        {
          role: "user",
          content: `Analiza la situación del hogar y genera recomendaciones de asignación.

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
        },
      ],
      stream: false,
    },
  });

  const message = result.choices?.[0]?.message;
  const text = typeof message?.content === "string" ? message.content : '{"recommendations":[],"insights":[]}';

  try {
    return JSON.parse(text) as {
      recommendations: Array<{
        taskName: string;
        suggestedMember: string;
        reason: string;
        priority: "high" | "medium" | "low";
      }>;
      insights: string[];
    };
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as { recommendations: Array<{ taskName: string; suggestedMember: string; reason: string; priority: "high" | "medium" | "low" }>; insights: string[] };
    }
    return { recommendations: [], insights: [] };
  }
}

/**
 * Generate AI plan for task assignments using OpenRouter.
 */
export async function generateAIPlanOpenRouter(context: {
  members: Array<{ id: string; name: string; type: string; pendingCount: number; availability?: { weekday: string[]; weekend: string[]; notes?: string } | null }>;
  tasks: Array<{ name: string; frequency: string; weight: number }>;
  durationDays?: number;
  regionalBlock?: string;
  feedbackBlock?: string;
}) {
  const planDays = context.durationDays ?? 7;
  const dailyCount = Math.min(planDays, 7);
  const client = getClient();

  const result = await client.chat.send({
    chatGenerationParams: {
      model: MODEL_VARIANTS.standard,
      messages: [
        {
          role: "system",
          content: `Eres un planificador de tareas del hogar. Genera un plan de asignaciones en formato JSON.
Responde SOLO con JSON válido siguiendo este schema:
{
  "assignments": [
    { "taskName": "string", "memberId": "string (ID exacto del miembro)", "memberName": "string (nombre del miembro)", "reason": "string", "dayOfWeek": number (1=Lunes..7=Domingo), "startTime": "HH:mm", "endTime": "HH:mm" }
  ],
  "balanceScore": number (0-100),
  "notes": ["string"]
}`,
        },
        {
          role: "user",
          content: `Genera un plan de asignaciones para esta semana.

Capacidad por tipo de miembro:
- ADULT: 100% de capacidad
- TEEN: 60% de capacidad
- CHILD: 30% de capacidad

Miembros del hogar:
${context.members.map((m) => {
  let info = `- [ID: ${m.id}] ${m.name} (${m.type}): ${m.pendingCount} tareas pendientes`;
  if (m.availability) {
    const slotLabels: Record<string, string> = { MORNING: "mañanas (7-12)", AFTERNOON: "tardes (12-18)", NIGHT: "noches (18-22)" };
    const wd = m.availability.weekday.map((s) => slotLabels[s]).filter(Boolean).join(", ");
    const we = m.availability.weekend.map((s) => slotLabels[s]).filter(Boolean).join(", ");
    if (wd) info += ` | Disponible L-V: ${wd}`;
    if (we) info += ` | Disponible S-D: ${we}`;
    if (m.availability.notes) info += ` | Nota: "${m.availability.notes}"`;
  }
  return info;
}).join("\n")}

Tareas disponibles:
${context.tasks.map((t) => `- ${t.name} (${t.frequency}, peso ${t.weight})`).join("\n")}

Instrucciones:
1. Asigna TODAS las tareas activas a los miembros
2. Balancea la carga considerando la capacidad de cada tipo de miembro
3. Rota las tareas - no siempre la misma persona para la misma tarea
4. Si alguien tiene muchas tareas pendientes, asignarle menos nuevas
5. Los niños (CHILD) no deben recibir tareas complejas o peligrosas
6. Proporciona una breve razón para cada asignación
7. IMPORTANTE: Usa el ID exacto del miembro (campo "memberId") tal como aparece entre [ID: ...]. Dos miembros pueden tener el mismo nombre.
8. DISTRIBUYE las tareas en los DÍAS DE LA SEMANA usando "dayOfWeek" (1=Lunes..7=Domingo). El plan cubre ${planDays} días.
   - Tareas DAILY: genera EXACTAMENTE ${dailyCount} asignaciones (una por cada día, dayOfWeek 1 a ${dailyCount}). Puedes rotar miembros.
   - Tareas WEEKLY: genera UNA sola asignación.
   - Tareas BIWEEKLY/ONCE: genera UNA sola asignación.
   - Balancea la carga diaria.
9. Para cada tarea, sugiere un RANGO HORARIO razonable usando "startTime" y "endTime" (formato "HH:mm").
   - RESPETA la disponibilidad horaria de cada miembro. Solo asigna tareas en los bloques donde el miembro indicó estar disponible.
   - Si un miembro no tiene disponibilidad configurada, distribuye razonablemente pero NO llenes todo el día.
   - Agrupa tareas consecutivas en bloques compactos (ej: 2 tareas de 15min juntas de 18:00 a 18:30, no separadas por horas).
   - No asignes más de 60-90 minutos de tareas por día por persona salvo que sea estrictamente necesario.
   - Dejá tiempo libre, especialmente los fines de semana. Las tareas deben sentirse manejables, no una jornada laboral.
   - No asignes tareas a niños (CHILD) en horarios de madrugada o noche.
   - Si un miembro tiene una nota de disponibilidad, respetala.
   - Ejemplo: "startTime": "18:00", "endTime": "18:30"

El objetivo es maximizar la equidad (balanceScore alto = más justo).${context.regionalBlock ? `\n\n${context.regionalBlock}` : ""}${context.feedbackBlock ?? ""}`,
        },
      ],
      stream: false,
    },
  });

  const message = result.choices?.[0]?.message;
  const text = typeof message?.content === "string" ? message.content : '{"assignments":[],"balanceScore":0,"notes":[]}';

  try {
    return JSON.parse(text) as {
      assignments: Array<{ taskName: string; memberId: string; memberName: string; reason: string; dayOfWeek?: number; startTime?: string; endTime?: string }>;
      balanceScore: number;
      notes: string[];
    };
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as { assignments: Array<{ taskName: string; memberId: string; memberName: string; reason: string; dayOfWeek?: number; startTime?: string; endTime?: string }>; balanceScore: number; notes: string[] };
    }
    return null;
  }
}
