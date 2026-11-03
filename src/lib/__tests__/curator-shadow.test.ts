import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { askJevMock, createManyMock } = vi.hoisted(() => ({
  askJevMock: vi.fn(),
  createManyMock: vi.fn(),
}));

vi.mock("@/lib/ai/decide", () => ({
  askJev: askJevMock,
  isJevEnabled: () => true,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiShadowJudgment: {
      createMany: createManyMock,
    },
  },
}));

import { buildCuratorQuestions, runCuratorShadow, scoreToBand } from "../events/pipeline/curator-shadow";
import { CULTURAL_EVENT_TAGS } from "../events/pipeline/curate-events";

import type { CuratedEvent } from "../events/pipeline/types";

function buildEvent(overrides: Partial<CuratedEvent> = {}): CuratedEvent {
  return {
    title: "Recital en el parque",
    date: "2026-12-01",
    time: "21:00",
    venue: "Parque Centenario",
    address: null,
    categoryGuess: "musica",
    description: "Un recital gratuito al aire libre",
    priceMin: 0,
    priceMax: null,
    artists: ["Banda X"],
    sourceUrl: "https://example.com",
    culturalCategory: "MUSICA",
    culturalScore: 7,
    originalityScore: 6,
    editorialHighlight: "",
    finalScore: 7,
    ...overrides,
  };
}

describe("scoreToBand", () => {
  it.each([
    [0, 0],
    [2, 0],
    [3, 1],
    [4, 1],
    [5, 2],
    [6, 2],
    [7, 3],
    [8, 3],
    [9, 4],
    [10, 4],
  ])("maps score %d to band %d", (input, expected) => {
    expect(scoreToBand(input)).toBe(expected);
  });

  it("rounds before banding", () => {
    expect(scoreToBand(2.6)).toBe(1); // rounds to 3 -> band 1
    expect(scoreToBand(2.4)).toBe(0); // rounds to 2 -> band 0
  });
});

describe("buildCuratorQuestions", () => {
  it("offers exactly the 10 CULTURAL_EVENT_TAGS as category options", () => {
    const questions = buildCuratorQuestions();
    const labels = Object.keys(questions.category.criteria);
    expect(labels).toHaveLength(10);
    expect([...labels].sort()).toEqual([...CULTURAL_EVENT_TAGS].sort());
  });

  it("gives each score question exactly 5 ordered levels", () => {
    const questions = buildCuratorQuestions();
    expect(questions.culturalInterest.criteria).toHaveLength(5);
    expect(questions.originality.criteria).toHaveLength(5);
  });
});

describe("runCuratorShadow", () => {
  const originalFlag = process.env.JEV_SHADOW_CURATOR;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.JEV_SHADOW_CURATOR;
  });

  afterAll(() => {
    if (originalFlag === undefined) delete process.env.JEV_SHADOW_CURATOR;
    else process.env.JEV_SHADOW_CURATOR = originalFlag;
  });

  it("is a no-op when the flag is off", async () => {
    await runCuratorShadow([buildEvent()], "Buenos Aires");

    expect(askJevMock).not.toHaveBeenCalled();
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("writes one shadow row per answered event when the flag is on", async () => {
    process.env.JEV_SHADOW_CURATOR = "on";
    askJevMock.mockResolvedValue({
      model: "jev-1.14.0",
      usage: { input_tokens: 120, output_tokens: 0 },
      answers: {
        category: { type: "choice", choice: "MUSICA", confidence: 0.92, probabilities: { MUSICA: 0.92 } },
        culturalInterest: { type: "score", score: 3, confidence: 0.8, legend: {}, probabilities: {} },
        originality: { type: "score", score: 2, confidence: 0.7, legend: {}, probabilities: {} },
      },
    });

    const events = [buildEvent(), buildEvent({ title: "Obra de teatro", culturalCategory: "TEATRO" })];
    await runCuratorShadow(events, "Buenos Aires");

    expect(askJevMock).toHaveBeenCalledTimes(2);
    expect(createManyMock).toHaveBeenCalledTimes(1);

    const data = createManyMock.mock.calls[0]?.[0]?.data;
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      task: "events.curator",
      shadowModel: "jev-1.14.0",
      inputTokens: 120,
      shadow: { category: "MUSICA", culturalBand: 3, originalityBand: 2 },
    });
  });

  it("skips a null answer without throwing or writing a row for it", async () => {
    process.env.JEV_SHADOW_CURATOR = "on";
    askJevMock.mockResolvedValue(null);

    await expect(runCuratorShadow([buildEvent()], "Buenos Aires")).resolves.toBeUndefined();

    expect(askJevMock).toHaveBeenCalledTimes(1);
    expect(createManyMock).not.toHaveBeenCalled();
  });
});
