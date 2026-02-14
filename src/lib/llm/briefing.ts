import { getLLMProvider } from "./provider";

export interface BriefingContext {
  currentMember: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  yesterdayCompletedCount: number;
  yesterdayCompletedNames: string[];
  todayPendingCount: number;
  todayPendingNames: string[];
  overdueCount: number;
  overdueNames: string[];
  pendingByMember: Array<{ name: string; pending: number }>;
  weeklyCompletedCount: number;
  weeklyTopContributors: Array<{ name: string; count: number }>;
  regionalPromptBlock?: string;
}

export interface BriefingResponse {
  greeting: string;
  summary: string;
  highlights: string[];
  suggestion: string;
}

const TIME_GREETINGS: Record<string, string> = {
  morning: "Buenos días",
  afternoon: "Buenas tardes",
  evening: "Buenas noches",
  night: "Buenas noches",
};

/**
 * Generate a daily briefing using LLM, with deterministic fallback on failure.
 */
export async function generateBriefing(
  context: BriefingContext
): Promise<BriefingResponse> {
  const provider = await getLLMProvider();
  const prompt = buildBriefingPrompt(context);
  const greeting = buildGreeting(context);

  try {
    const result = await provider.completeWithSchema<{
      summary: string;
      highlights: string[];
      suggestion: string;
    }>({
      prompt,
      outputSchema: {
        summary: "string (max 120 chars, resumen general del hogar)",
        highlights: "array of strings (2-4 items, max 80 chars each)",
        suggestion: "string (max 100 chars, consejo accionable)",
      },
      modelVariant: "fast",
    });

    return {
      greeting,
      summary: result.summary,
      highlights: Array.isArray(result.highlights) ? result.highlights.slice(0, 4) : [],
      suggestion: result.suggestion,
    };
  } catch (error) {
    console.error("Error generating briefing:", error);
    return generateFallbackBriefing(context);
  }
}

/**
 * Deterministic fallback — always works without LLM.
 */
export function generateFallbackBriefing(
  context: BriefingContext
): BriefingResponse {
  const greeting = buildGreeting(context);
  const summary = buildSummary(context);
  const highlights = buildHighlights(context);
  const suggestion = buildSuggestion(context);

  return { greeting, summary, highlights, suggestion };
}

function buildGreeting(context: BriefingContext): string {
  const timeGreeting = TIME_GREETINGS[context.timeOfDay] ?? "Hola";
  return `${timeGreeting}, ${context.currentMember}`;
}

function buildSummary(context: BriefingContext): string {
  const parts: string[] = [];

  if (context.yesterdayCompletedCount > 0) {
    parts.push(`Ayer se completaron ${context.yesterdayCompletedCount} tarea${context.yesterdayCompletedCount > 1 ? "s" : ""}`);
  } else {
    parts.push("Ayer no se completaron tareas");
  }

  if (context.todayPendingCount > 0) {
    parts.push(`hoy tenés ${context.todayPendingCount} pendiente${context.todayPendingCount > 1 ? "s" : ""}`);
  } else {
    parts.push("hoy no tenés pendientes");
  }

  return `${parts.join(" y ")}.`;
}

function buildHighlights(context: BriefingContext): string[] {
  const highlights: string[] = [];

  // Overdue tasks (highest priority)
  if (context.overdueCount > 0) {
    const names = context.overdueNames.slice(0, 2).join(", ");
    highlights.push(`${context.overdueCount} tarea${context.overdueCount > 1 ? "s" : ""} de días anteriores: ${names}`);
  }

  // Yesterday recap
  if (context.yesterdayCompletedCount > 0) {
    const names = context.yesterdayCompletedNames.slice(0, 3).join(", ");
    highlights.push(`Ayer se completó: ${names}`);
  }

  // Today pending
  if (context.todayPendingCount > 0) {
    const names = context.todayPendingNames.slice(0, 3).join(", ");
    highlights.push(`Pendientes hoy: ${names}`);
  }

  // Weekly progress
  if (context.weeklyCompletedCount > 0) {
    highlights.push(`${context.weeklyCompletedCount} tareas completadas esta semana`);
  }

  // Workload imbalance
  if (context.pendingByMember.length >= 2) {
    const sorted = [...context.pendingByMember].sort((a, b) => b.pending - a.pending);
    const most = sorted[0]!;
    const least = sorted[sorted.length - 1]!;
    if (most.pending - least.pending >= 3) {
      highlights.push(`${most.name} tiene ${most.pending - least.pending} tareas más que ${least.name}`);
    }
  }

  return highlights.slice(0, 4);
}

function buildSuggestion(context: BriefingContext): string {
  // Workload imbalance suggestion
  if (context.pendingByMember.length >= 2) {
    const sorted = [...context.pendingByMember].sort((a, b) => b.pending - a.pending);
    const most = sorted[0]!;
    const least = sorted[sorted.length - 1]!;
    if (most.pending - least.pending >= 3) {
      return `Podrían repartir mejor la carga: ${most.name} tiene muchas más que ${least.name}.`;
    }
  }

  if (context.overdueCount > 0) {
    return "Hay algunas tareas pendientes de días anteriores, buen momento para arrancar por ahí.";
  }

  if (context.todayPendingCount === 0 && context.overdueCount === 0) {
    return "¡El hogar está al día! Buen momento para planificar la semana.";
  }

  // Top contributor shoutout
  if (context.weeklyTopContributors.length > 0) {
    const top = context.weeklyTopContributors[0]!;
    if (top.count >= 3) {
      return `${top.name} lleva ${top.count} tareas esta semana. ¡Buen ritmo!`;
    }
  }

  return "Buen ritmo esta semana, ¡seguí así!";
}

function buildBriefingPrompt(context: BriefingContext): string {
  const yesterdayList = context.yesterdayCompletedNames.length > 0
    ? context.yesterdayCompletedNames.join(", ")
    : "(ninguna)";

  const todayList = context.todayPendingNames.length > 0
    ? context.todayPendingNames.join(", ")
    : "(ninguna)";

  const overdueList = context.overdueNames.length > 0
    ? context.overdueNames.join(", ")
    : "(ninguna)";

  const workload = context.pendingByMember
    .map((m) => `${m.name}: ${m.pending}`)
    .join(", ");

  const topContributors = context.weeklyTopContributors
    .map((c) => `${c.name}: ${c.count}`)
    .join(", ");

  return `Generá un briefing diario para ${context.currentMember} sobre el estado del hogar.

## Datos
- Completadas ayer: ${yesterdayList} (${context.yesterdayCompletedCount} total)
- Pendientes hoy: ${todayList} (${context.todayPendingCount} total)
- Vencidas: ${context.overdueCount > 0 ? overdueList : "ninguna"}
- Carga por miembro: ${workload || "sin datos"}
- Completadas esta semana: ${context.weeklyCompletedCount}
- Top contribuidores: ${topContributors || "sin datos"}

## Formato (JSON)
{
  "summary": "Resumen general del hogar en 1-2 oraciones (max 120 chars). Ejemplo: 'Van bien esta semana, completaron 3 tareas ayer.'",
  "highlights": ["2-4 bullets concretos (max 80 chars c/u). Mezcla: tareas completadas, pendientes, alertas, tendencias."],
  "suggestion": "Un consejo accionable y concreto (max 100 chars). Ejemplo: 'Podrían repartir las tareas de cocina entre más miembros.'"
}

Reglas:
- Tono POSITIVO y motivador. Nunca culpar, presionar ni hacer sentir mal al usuario
- No uses palabras como "flojos", "mal", "critico", "ojo", "cuidado", "atrasados"
- Si hay tareas vencidas, mencionalo de forma neutral como dato informativo, nunca como reproche
- Nombrá tareas y miembros CONCRETOS, no genéricos
- Si no hay pendientes, celebrá en el summary
- La suggestion debe ser constructiva: qué se puede hacer, no qué se hizo mal
- Cruzá datos: carga entre miembros, tendencias semanales
- Respondé SOLO con JSON válido${context.regionalPromptBlock ? `\n\n${context.regionalPromptBlock}` : ""}`;
}
