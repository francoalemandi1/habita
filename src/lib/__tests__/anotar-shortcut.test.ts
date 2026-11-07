import { describe, expect, it } from "vitest";

import { shouldOpenAnotarFromKeydown } from "@/components/features/anotar/anotar-shortcut";

import type { AnotarKeydownEvent } from "@/components/features/anotar/anotar-shortcut";

function keydown(overrides: Partial<AnotarKeydownEvent> = {}): AnotarKeydownEvent {
  return {
    key: "n",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    target: null,
    ...overrides,
  };
}

describe("shouldOpenAnotarFromKeydown", () => {
  it("opens Anotar on a bare N with no focused input", () => {
    expect(shouldOpenAnotarFromKeydown(keydown())).toBe(true);
  });

  it("ignores keys other than N", () => {
    expect(shouldOpenAnotarFromKeydown(keydown({ key: "m" }))).toBe(false);
  });

  it("ignores N with a modifier held", () => {
    expect(shouldOpenAnotarFromKeydown(keydown({ metaKey: true }))).toBe(false);
    expect(shouldOpenAnotarFromKeydown(keydown({ ctrlKey: true }))).toBe(false);
    expect(shouldOpenAnotarFromKeydown(keydown({ altKey: true }))).toBe(false);
  });

  it("ignores N typed into an input, textarea or select", () => {
    expect(shouldOpenAnotarFromKeydown(keydown({ target: { tagName: "INPUT" } }))).toBe(false);
    expect(shouldOpenAnotarFromKeydown(keydown({ target: { tagName: "TEXTAREA" } }))).toBe(false);
    expect(shouldOpenAnotarFromKeydown(keydown({ target: { tagName: "SELECT" } }))).toBe(false);
  });

  it("ignores N typed into a contenteditable element", () => {
    expect(
      shouldOpenAnotarFromKeydown(keydown({ target: { tagName: "DIV", isContentEditable: true } })),
    ).toBe(false);
  });

  it("opens Anotar when the target is a non-typing element", () => {
    expect(shouldOpenAnotarFromKeydown(keydown({ target: { tagName: "BUTTON" } }))).toBe(true);
  });
});
