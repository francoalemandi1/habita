import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { systemOneMock, TypeSafeClientMock } = vi.hoisted(() => {
  const systemOneMock = vi.fn();
  const TypeSafeClientMock = vi.fn().mockImplementation(function TypeSafeClientMockImpl() {
    return { systemOne: systemOneMock };
  });
  return { systemOneMock, TypeSafeClientMock };
});

vi.mock("@typesafe-ai/sdk", () => ({
  TypeSafeClient: TypeSafeClientMock,
}));

import { askJev, isJevEnabled } from "../ai/decide";

describe("isJevEnabled", () => {
  const originalKey = process.env.TYPESAFE_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.TYPESAFE_API_KEY;
    else process.env.TYPESAFE_API_KEY = originalKey;
  });

  it("is false without an API key", () => {
    delete process.env.TYPESAFE_API_KEY;
    expect(isJevEnabled()).toBe(false);
  });

  it("is false for a blank API key", () => {
    process.env.TYPESAFE_API_KEY = "   ";
    expect(isJevEnabled()).toBe(false);
  });

  it("is true when an API key is present", () => {
    process.env.TYPESAFE_API_KEY = "test-key";
    expect(isJevEnabled()).toBe(true);
  });
});

describe("askJev", () => {
  const originalKey = process.env.TYPESAFE_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.TYPESAFE_API_KEY;
    else process.env.TYPESAFE_API_KEY = originalKey;
  });

  it("returns null without an API key and never constructs a client", async () => {
    delete process.env.TYPESAFE_API_KEY;

    const result = await askJev({ task: "test.task", state: "hello", questions: {} });

    expect(result).toBeNull();
    expect(TypeSafeClientMock).not.toHaveBeenCalled();
  });

  it("returns null and logs when the client rejects", async () => {
    process.env.TYPESAFE_API_KEY = "test-key";
    systemOneMock.mockRejectedValue(new Error("boom"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await askJev({ task: "events.curator", state: "hello", questions: {} });

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("events.curator"),
      expect.anything(),
    );
    expect(infoSpy).toHaveBeenCalledWith(
      "[ai]",
      expect.objectContaining({ task: "events.curator", provider: "jev", ok: false }),
    );

    errorSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("returns the SDK result and logs ok:true on success", async () => {
    process.env.TYPESAFE_API_KEY = "test-key";
    systemOneMock.mockResolvedValue({
      model: "jev-1.14.0",
      answers: { billing: { type: "noul", noul: 0.9 } },
      usage: { input_tokens: 42, output_tokens: 0 },
    });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await askJev({ task: "events.curator", state: "hello", questions: {} });

    expect(result).toEqual({
      model: "jev-1.14.0",
      answers: { billing: { type: "noul", noul: 0.9 } },
      usage: { input_tokens: 42, output_tokens: 0 },
    });
    expect(infoSpy).toHaveBeenCalledWith(
      "[ai]",
      expect.objectContaining({
        task: "events.curator",
        provider: "jev",
        model: "jev-1.14.0",
        inputTokens: 42,
        ok: true,
      }),
    );

    infoSpy.mockRestore();
  });
});
