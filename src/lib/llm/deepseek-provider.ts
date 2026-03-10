/**
 * DeepSeek LLM provider — primary provider for all non-multimodal AI services.
 * Uses @ai-sdk/deepseek (Vercel AI SDK native) for structured output and streaming.
 */

import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText } from "ai";

import type { LLMProvider } from "./types";
import { DEFAULT_LLM_TIMEOUT_MS } from "./types";

if (!process.env.DEEPSEEK_API_KEY) {
  console.warn("[LLM] DEEPSEEK_API_KEY is not set — DeepSeek provider will fail at runtime");
}

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
      try {
        return JSON.parse(result.text) as T;
      } catch {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as T;
        }
        throw new Error("Failed to parse DeepSeek response as JSON");
      }
    } finally {
      clearTimeout(timeout);
    }
  },
};

/** Returns the DeepSeek model for direct use with generateObject / streamText. */
export function getDeepSeekModel() {
  return deepseek(MODEL);
}
