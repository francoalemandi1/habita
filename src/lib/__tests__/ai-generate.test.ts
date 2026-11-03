import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { generateObjectMock } = vi.hoisted(() => ({
  generateObjectMock: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: generateObjectMock,
}));

vi.mock("@/lib/ai/models", () => ({
  getLanguageModel: vi.fn(() => ({
    model: { modelId: "stub-model" },
    provider: "deepseek",
    modelId: "deepseek-chat",
  })),
}));

import { generateStructured } from "@/lib/ai/generate";

const schema = z.object({ answer: z.string() });

describe("generateStructured", () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
  });

  it("returns the parsed object and logs ok:true with usage", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    generateObjectMock.mockResolvedValue({
      object: { answer: "hola" },
      usage: { inputTokens: 10, outputTokens: 5 },
    });

    const result = await generateStructured({
      task: "test-task",
      schema,
      prompt: "hola",
    });

    expect(result).toEqual({ answer: "hola" });
    expect(infoSpy).toHaveBeenCalledWith(
      "[ai]",
      expect.objectContaining({
        task: "test-task",
        provider: "deepseek",
        model: "deepseek-chat",
        inputTokens: 10,
        outputTokens: 5,
        ok: true,
      }),
    );

    infoSpy.mockRestore();
  });

  it("logs ok:false and rethrows on failure", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = new Error("boom");
    generateObjectMock.mockRejectedValue(error);

    await expect(
      generateStructured({ task: "test-task", schema, prompt: "hola" }),
    ).rejects.toThrow("boom");

    expect(infoSpy).toHaveBeenCalledWith(
      "[ai]",
      expect.objectContaining({
        task: "test-task",
        ok: false,
        error: "boom",
      }),
    );

    infoSpy.mockRestore();
  });

  it("passes an abort signal to generateObject", async () => {
    generateObjectMock.mockResolvedValue({ object: { answer: "hola" }, usage: {} });

    await generateStructured({ task: "test-task", schema, prompt: "hola" });

    const callArgs = generateObjectMock.mock.calls[0]?.[0];
    expect(callArgs.abortSignal).toBeInstanceOf(AbortSignal);
  });
});
