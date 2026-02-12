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
 * Priority: OpenRouter > Gemini > Anthropic > None
 */
export function getAIProviderType(): "openrouter" | "gemini" | "anthropic" | "none" {
  if (process.env.OPENROUTER_API_KEY) {
    return "openrouter";
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return "gemini";
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return "anthropic";
  }
  return "none";
}

/**
 * Get the LLM provider based on environment configuration.
 * Priority: OpenRouter > Gemini > Anthropic > Stub
 */
export async function getLLMProvider(): Promise<ILLMProvider> {
  const providerType = getAIProviderType();

  if (providerType === "openrouter") {
    const { openrouterProvider } = await import("./openrouter-provider");
    return openrouterProvider;
  }

  if (providerType === "gemini") {
    const { geminiProvider } = await import("./gemini-provider");
    return geminiProvider;
  }

  if (providerType === "anthropic") {
    const { anthropicProvider } = await import("./anthropic-provider");
    return anthropicProvider;
  }

  return stubLLMProvider;
}

/**
 * Check if AI features are enabled (any API key is configured).
 */
export function isAIEnabled(): boolean {
  return getAIProviderType() !== "none";
}
