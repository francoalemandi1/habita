import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

import type { LLMProvider } from "./types";
import { DEFAULT_LLM_TIMEOUT_MS } from "./types";

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  console.warn("[LLM] GOOGLE_GENERATIVE_AI_API_KEY is not set — Gemini provider will fail at runtime");
}

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const MODEL_VARIANTS = {
  fast: "gemini-1.5-flash",
  standard: "gemini-1.5-flash",
  powerful: "gemini-1.5-pro",
} as const;

/**
 * Google Gemini provider implementation.
 * Uses Vercel AI SDK for structured outputs and streaming.
 */
export const geminiProvider: LLMProvider = {
  async completeWithSchema<T>(options: {
    prompt: string;
    outputSchema: object;
    modelVariant?: "fast" | "standard" | "powerful";
    timeoutMs?: number;
  }): Promise<T> {
    const model = google(MODEL_VARIANTS[options.modelVariant ?? "standard"]);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS);

    try {
      const result = await generateText({
        model,
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
        throw new Error("Failed to parse LLM response as JSON");
      }
    } finally {
      clearTimeout(timer);
    }
  },
};

