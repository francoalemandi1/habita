import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getAIProviderType } from "@/lib/llm/provider";
import { getDeepSeekModel } from "@/lib/llm/deepseek-provider";

import type { LanguageModel } from "ai";

export type ModelTier = "fast" | "standard";

/** Verified current Gemini model IDs (2026-11-03). DeepSeek uses the same model for both tiers. */
export const GEMINI_MODELS = {
  fast: "gemini-3.5-flash-lite",
  standard: "gemini-3.8-flash",
} as const;

const DEEPSEEK_MODEL_ID = "deepseek-chat";

export class AIUnavailableError extends Error {
  constructor(message = "No AI provider is configured") {
    super(message);
    this.name = "AIUnavailableError";
  }
}

let googleInstance: ReturnType<typeof createGoogleGenerativeAI> | undefined;

function getGoogleInstance() {
  googleInstance ??= createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
  return googleInstance;
}

export interface LanguageModelSelection {
  model: LanguageModel;
  provider: "deepseek" | "gemini";
  modelId: string;
}

/**
 * Single entry point for picking the configured LLM. Priority: DeepSeek > Gemini > throw.
 */
export function getLanguageModel(tier: ModelTier = "standard"): LanguageModelSelection {
  const providerType = getAIProviderType();

  if (providerType === "deepseek") {
    return { model: getDeepSeekModel(), provider: "deepseek", modelId: DEEPSEEK_MODEL_ID };
  }

  if (providerType === "gemini") {
    const modelId = GEMINI_MODELS[tier];
    return { model: getGoogleInstance()(modelId), provider: "gemini", modelId };
  }

  throw new AIUnavailableError();
}
