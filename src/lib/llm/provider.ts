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
 * Check if AI features are enabled (any API key is configured).
 */
export function isAIEnabled(): boolean {
  return getAIProviderType() !== "none";
}
