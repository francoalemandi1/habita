import { generateObject } from "ai";
import { getLanguageModel } from "./models";

import type { ModelTier } from "./models";
import type { z } from "zod";

/** Default timeout for LLM calls (30 seconds). */
export const DEFAULT_LLM_TIMEOUT_MS = 30_000;

export interface GenerateStructuredParams<T> {
  task: string;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  prompt: string;
  system?: string;
  tier?: ModelTier;
  timeoutMs?: number;
  temperature?: number;
}

/**
 * Single gateway for structured LLM generation. Picks the configured provider/model,
 * logs exactly one line per call, and rethrows on failure after logging.
 */
export async function generateStructured<T>(params: GenerateStructuredParams<T>): Promise<T> {
  const { task, schema, prompt, system, tier = "standard", timeoutMs, temperature } = params;
  const { model, provider, modelId } = getLanguageModel(tier);
  const startedAt = Date.now();

  try {
    const result = await generateObject({
      model,
      schema,
      prompt,
      system,
      temperature,
      abortSignal: AbortSignal.timeout(timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS),
    });

    console.info("[ai]", {
      task,
      provider,
      model: modelId,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      durationMs: Date.now() - startedAt,
      ok: true,
    });

    return result.object;
  } catch (error) {
    console.info("[ai]", {
      task,
      provider,
      model: modelId,
      durationMs: Date.now() - startedAt,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
