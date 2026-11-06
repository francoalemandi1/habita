import { describe, expect, it } from "vitest";
import { createRequestSequencer, shouldTriggerParse } from "@/lib/anotar-parse-trigger";

describe("shouldTriggerParse", () => {
  it("does not trigger for text under 3 trimmed chars", () => {
    expect(shouldTriggerParse("  hi", null)).toBe(false);
  });

  it("triggers for 3+ trimmed chars not parsed before", () => {
    expect(shouldTriggerParse("  Sofi pagó 5000  ", null)).toBe(true);
  });

  it("does not trigger when the trimmed text matches the last parsed text", () => {
    expect(shouldTriggerParse("  Sofi pagó 5000  ", "Sofi pagó 5000")).toBe(false);
  });

  it("triggers again once the text changes after a previous parse", () => {
    expect(shouldTriggerParse("Sofi pagó 5000 de luz", "Sofi pagó 5000")).toBe(true);
  });
});

describe("createRequestSequencer", () => {
  it("marks only the most recently started request as latest", () => {
    const sequencer = createRequestSequencer();
    const first = sequencer.next();
    const second = sequencer.next();

    expect(sequencer.isLatest(first)).toBe(false);
    expect(sequencer.isLatest(second)).toBe(true);
  });

  it("treats a single in-flight request as latest", () => {
    const sequencer = createRequestSequencer();
    const id = sequencer.next();

    expect(sequencer.isLatest(id)).toBe(true);
  });
});
