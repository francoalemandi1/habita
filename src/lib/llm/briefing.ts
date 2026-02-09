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
  regionalPromptBlock?: string;
}

export interface BriefingResponse {
  greeting: string;
  line1: string;
  line2: string;
  line3: string;
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
  const provider = getLLMProvider();
  const prompt = buildBriefingPrompt(context);
  const greeting = buildGreeting(context);

  try {
    const result = await provider.completeWithSchema<{
      line1: string;
      line2: string;
      line3: string;
    }>({
      prompt,
      outputSchema: {
        line1: "string (max 80 chars)",
        line2: "string (max 80 chars)",
        line3: "string (max 80 chars)",
      },
      modelVariant: "fast",
    });

    return { greeting, ...result };
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

  // Line 1: yesterday recap
  let line1: string;
  if (context.yesterdayCompletedCount === 0) {
    line1 = "Ayer no se completaron tareas.";
  } else if (context.yesterdayCompletedCount === 1) {
    line1 = `Ayer se completó: ${context.yesterdayCompletedNames[0] ?? "1 tarea"}.`;
  } else {
    const names = context.yesterdayCompletedNames.slice(0, 3).join(", ");
    const suffix = context.yesterdayCompletedCount > 3
      ? ` y ${context.yesterdayCompletedCount - 3} más`
      : "";
    line1 = `Ayer se completaron ${context.yesterdayCompletedCount}: ${names}${suffix}.`;
  }

  // Line 2: today outlook
  let line2: string;
  if (context.overdueCount > 0) {
    const names = context.overdueNames.slice(0, 2).join(", ");
    line2 = `${context.overdueCount} tarea${context.overdueCount > 1 ? "s" : ""} vencida${context.overdueCount > 1 ? "s" : ""}: ${names}.`;
  } else if (context.todayPendingCount === 0) {
    line2 = "No tenés tareas pendientes hoy.";
  } else {
    const names = context.todayPendingNames.slice(0, 3).join(", ");
    line2 = `Hoy tenés ${context.todayPendingCount} pendiente${context.todayPendingCount > 1 ? "s" : ""}: ${names}.`;
  }

  // Line 3: contextual extra
  const line3 = buildExtraLine(context);

  return { greeting, line1, line2, line3 };
}

function buildGreeting(context: BriefingContext): string {
  const timeGreeting = TIME_GREETINGS[context.timeOfDay] ?? "Hola";
  return `${timeGreeting}, ${context.currentMember}`;
}

function buildExtraLine(context: BriefingContext): string {
  // Check workload imbalance between members
  if (context.pendingByMember.length >= 2) {
    const sorted = [...context.pendingByMember].sort((a, b) => b.pending - a.pending);
    const most = sorted[0]!;
    const least = sorted[sorted.length - 1]!;
    const diff = most.pending - least.pending;
    if (diff >= 3) {
      return `${most.name} tiene ${diff} tareas más que ${least.name}.`;
    }
  }

  if (context.todayPendingCount === 0 && context.overdueCount === 0) {
    return "Buen ritmo, ¡el hogar está al día!";
  }

  return "Buen ritmo esta semana.";
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

  return `Generá un briefing diario de EXACTAMENTE 3 líneas cortas para ${context.currentMember}.

## Datos
- Completadas ayer: ${yesterdayList} (${context.yesterdayCompletedCount} total)
- Pendientes hoy: ${todayList} (${context.todayPendingCount} total)
- Vencidas: ${context.overdueCount > 0 ? overdueList : "ninguna"}
- Carga por miembro: ${workload || "sin datos"}

## Formato (JSON)
{
  "line1": "Qué pasó ayer (max 80 chars)",
  "line2": "Qué hay pendiente hoy (max 80 chars)",
  "line3": "Un dato extra: clima, desbalance de carga entre miembros, o motivación (max 80 chars)"
}

Reglas:
- Nombrá tareas y miembros CONCRETOS
- Si no hubo completadas ayer, mencionalo brevemente
- Si no hay pendientes hoy, celebrá
- Si hay vencidas, priorizalas en line2
- Cruzá datos: carga entre miembros, clima si hay, urgencia
- Respondé SOLO con JSON válido${context.regionalPromptBlock ? `\n\n${context.regionalPromptBlock}` : ""}`;
}
