import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// The AI SDK graph is slow to transform cold; pay that once here, outside the per-test timeout.
const MODULE_WARMUP_TIMEOUT_MS = 30_000;

describe("getLanguageModel", () => {
  beforeAll(async () => {
    await import("@/lib/ai/models");
    vi.resetModules();
  }, MODULE_WARMUP_TIMEOUT_MS);

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("picks deepseek when DEEPSEEK_API_KEY is set", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "test-deepseek-key");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");

    const { getLanguageModel } = await import("@/lib/ai/models");
    const selection = getLanguageModel();

    expect(selection.provider).toBe("deepseek");
    expect(selection.modelId).toBe("deepseek-chat");
    expect(selection.model).toBeDefined();
  });

  it("picks gemini with the right tier model id when only the Google key is set", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-google-key");

    const { getLanguageModel, GEMINI_MODELS } = await import("@/lib/ai/models");

    expect(getLanguageModel("fast").modelId).toBe(GEMINI_MODELS.fast);
    expect(getLanguageModel("standard").modelId).toBe(GEMINI_MODELS.standard);
    expect(getLanguageModel().provider).toBe("gemini");
  });

  it("throws AIUnavailableError when no provider is configured", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");

    const { getLanguageModel, AIUnavailableError } = await import("@/lib/ai/models");

    expect(() => getLanguageModel()).toThrow(AIUnavailableError);
  });
});
