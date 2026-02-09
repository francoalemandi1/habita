/**
 * Plantillas de prompt para asistente y sugerencia de tareas (spec §9.3).
 * Variables: reemplazar {{variable}} en runtime.
 */

export const ASSISTANT_SYSTEM = `Eres un asistente de tareas del hogar. Responde en el mismo idioma que la pregunta. Sé directo y útil; si aplica, da una sugerencia concreta. Si preguntan "quién debería hacer X", considera: quién no lo hizo hace poco, carga actual (pendientes), equidad. No seas crítico con los miembros; usa los datos para respuestas objetivas. Si falta información, dilo.`;

/**
 * Build the assistant system prompt with optional regional context.
 * Falls back to the base ASSISTANT_SYSTEM if no regional block is provided.
 */
export function buildAssistantSystemPrompt(regionalBlock?: string): string {
  if (!regionalBlock) return ASSISTANT_SYSTEM;
  return `${ASSISTANT_SYSTEM}\n\n${regionalBlock}`;
}

export function buildAssistantPrompt(variables: {
  currentUser: string;
  members: string;
  tasks: string;
  recentActivity: string;
  memberStats: string;
  question: string;
}): string {
  return `
## Usuario actual
{{currentUser}}

## Miembros del hogar
{{members}}

## Tareas del hogar
{{tasks}}

## Actividad reciente (asignaciones)
{{recentActivity}}

## Estadísticas por miembro (esta semana)
{{memberStats}}

## Pregunta del usuario
{{question}}
`
    .replace(/\{\{currentUser\}\}/g, variables.currentUser)
    .replace(/\{\{members\}\}/g, variables.members)
    .replace(/\{\{tasks\}\}/g, variables.tasks)
    .replace(/\{\{recentActivity\}\}/g, variables.recentActivity)
    .replace(/\{\{memberStats\}\}/g, variables.memberStats)
    .replace(/\{\{question\}\}/g, variables.question)
    .trim();
}

export const SUGGEST_TASKS_SYSTEM = `Eres un experto en organización del hogar. A partir de la descripción del hogar (tipo de convivencia, vivienda, mascotas, jardín, número de personas si se menciona), genera entre 5 y 10 tareas recurrentes adecuadas. Por cada tarea: nombre claro y conciso (ej. "Lavar platos", "Sacar basura") y frecuencia: daily, weekly, biweekly o monthly. Prioriza tareas que suelen olvidarse o generar conflicto y que encajen con el contexto. No incluyas tareas claramente personales, que requieran habilidades muy específicas, ni tareas puntuales (solo recurrentes). Responde únicamente con un JSON válido: { "tasks": [ { "name": "...", "frequency": "..." } ] }.`;

export function buildSuggestTasksPrompt(householdDescription: string): string {
  return `Descripción del hogar:\n\n${householdDescription}`;
}
