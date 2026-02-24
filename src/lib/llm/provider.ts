import type {
  LLMProvider as ILLMProvider,
  AssistantOutput,
  SuggestedTasksOutput,
} from "./types";

const DEFAULT_ANSWER =
  "No pude procesar esa pregunta. Asegúrate de tener tareas y miembros en tu hogar.";
const DEFAULT_SUGGESTED_TASKS: SuggestedTasksOutput = { tasks: [] };

/**
 * Proveedor LLM stub: devuelve respuestas por defecto sin llamar a ningún modelo.
 * Usado cuando no hay API key configurada.
 */
export const stubLLMProvider: ILLMProvider = {
  async completeWithSchema<T>(options: {
    prompt: string;
    outputSchema: object;
    modelVariant?: "fast" | "standard" | "powerful";
    timeoutMs?: number;
  }): Promise<T> {
    const schema = options.outputSchema as object & { answer?: string; tasks?: unknown[] };
    if ("answer" in schema) {
      return {
        answer: DEFAULT_ANSWER,
        suggestion: undefined,
      } as T as AssistantOutput as T;
    }
    if ("tasks" in schema) {
      return DEFAULT_SUGGESTED_TASKS as T;
    }
    return {} as T;
  },
};

/**
 * Get the configured AI provider type.
 * Priority: DeepSeek > Gemini > None
 */
export function getAIProviderType(): "deepseek" | "gemini" | "none" {
  if (process.env.DEEPSEEK_API_KEY) {
    return "deepseek";
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return "gemini";
  }
  return "none";
}

/**
 * Get the LLM provider based on environment configuration.
 * Priority: DeepSeek > Gemini > Stub
 */
export async function getLLMProvider(): Promise<ILLMProvider> {
  const providerType = getAIProviderType();

  if (providerType === "deepseek") {
    const { deepseekProvider } = await import("./deepseek-provider");
    return deepseekProvider;
  }

  if (providerType === "gemini") {
    const { geminiProvider } = await import("./gemini-provider");
    return geminiProvider;
  }

  return stubLLMProvider;
}

/**
 * Check if AI features are enabled (any API key is configured).
 */
export function isAIEnabled(): boolean {
  return getAIProviderType() !== "none";
}
