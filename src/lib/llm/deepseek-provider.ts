/**
 * DeepSeek LLM provider — primary provider for all non-multimodal AI services.
 * Uses @ai-sdk/deepseek (Vercel AI SDK native) for structured output and streaming.
 */

import { createDeepSeek } from "@ai-sdk/deepseek";

if (!process.env.DEEPSEEK_API_KEY) {
  console.warn("[LLM] DEEPSEEK_API_KEY is not set — DeepSeek provider will fail at runtime");
}

const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });

const MODEL = "deepseek-chat";

/** Returns the DeepSeek model for direct use with generateObject / streamText. */
export function getDeepSeekModel() {
  return deepseek(MODEL);
}
