/**
 * DeepSeek LLM provider — primary provider for all non-multimodal AI services.
 * Uses @ai-sdk/deepseek (Vercel AI SDK native) for structured output and streaming.
 */

import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText } from "ai";

import type { LLMProvider } from "./types";
import { DEFAULT_LLM_TIMEOUT_MS } from "./types";

const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });

const MODEL = "deepseek-chat";

/** Pattern A provider — used by briefing, assistant, suggest-tasks via getLLMProvider(). */
export const deepseekProvider: LLMProvider = {
  async completeWithSchema<T>(options: {
    prompt: string;
    outputSchema: object;
    modelVariant?: "fast" | "standard" | "powerful";
    timeoutMs?: number;
  }): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS,
    );
    try {
      const result = await generateText({
        model: deepseek(MODEL),
        prompt: options.prompt,
        abortSignal: controller.signal,
      });
      return JSON.parse(result.text) as T;
    } finally {
      clearTimeout(timeout);
    }
  },
};

/** Returns the DeepSeek model for direct use with generateObject / streamText. */
export function getDeepSeekModel() {
  return deepseek(MODEL);
}
