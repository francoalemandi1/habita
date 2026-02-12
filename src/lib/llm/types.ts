/**
 * Interfaz agnóstica del proveedor LLM (spec §9.1).
 * Permite integrar cualquier backend (OpenAI, Anthropic, Azure, modelo local).
 */
/** Default timeout for LLM calls (30 seconds) */
export const DEFAULT_LLM_TIMEOUT_MS = 30_000;

export type LLMProvider = {
  completeWithSchema<T>(options: {
    prompt: string;
    outputSchema: object;
    modelVariant?: "fast" | "standard" | "powerful";
    timeoutMs?: number;
  }): Promise<T>;
};

/** Respuesta estructurada del asistente de preguntas (spec §4.4) */
export interface AssistantOutput {
  answer: string;
  suggestion?: string;
}

/** Respuesta estructurada de sugerencia de tareas (spec §5.3) */
export interface SuggestedTasksOutput {
  tasks: Array<{
    name: string;
    frequency: "daily" | "weekly" | "biweekly" | "monthly";
  }>;
}
