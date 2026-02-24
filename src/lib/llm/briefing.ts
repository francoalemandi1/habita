export interface BriefingContext {
  currentMember: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  yesterdayCompletedCount: number;
  yesterdayCompletedNames: string[];
  todayPendingCount: number;
  todayPendingNames: string[];
  pendingByMember: Array<{ name: string; pending: number }>;
  weeklyCompletedCount: number;
  weeklyTopContributors: Array<{ name: string; count: number }>;
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
 * Generate a daily briefing using deterministic logic.
 * No LLM needed — all data is structured and rule-based.
 */
export function generateBriefing(
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

  if (context.todayPendingCount === 0) {
    return "¡El hogar está al día! Buen momento para planificar la semana.";
  }

  // Top contributor shoutout (omit name for solo households)
  if (context.weeklyTopContributors.length > 0) {
    const top = context.weeklyTopContributors[0]!;
    if (top.count >= 3) {
      const isSolo = context.pendingByMember.length <= 1;
      return isSolo
        ? `Llevás ${top.count} tareas esta semana. ¡Buen ritmo!`
        : `${top.name} lleva ${top.count} tareas esta semana. ¡Buen ritmo!`;
    }
  }

  return "Buen ritmo esta semana, ¡seguí así!";
}
