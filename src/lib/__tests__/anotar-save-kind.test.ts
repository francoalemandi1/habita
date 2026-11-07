import { describe, expect, it } from "vitest";

import { resolveAnotarSaveKind } from "@/components/features/anotar/anotar-draft-types";

describe("resolveAnotarSaveKind", () => {
  it("resolves a parsed expense/task/item mode directly", () => {
    expect(resolveAnotarSaveKind("expense", "expense")).toBe("expense");
    expect(resolveAnotarSaveKind("task", "expense")).toBe("task");
    expect(resolveAnotarSaveKind("item", "expense")).toBe("item");
  });

  it("resolves a classic-form mode to its picked kind", () => {
    expect(resolveAnotarSaveKind("classic", "task")).toBe("task");
    expect(resolveAnotarSaveKind("classic", "item")).toBe("item");
  });

  it("returns null when there's nothing to save yet", () => {
    expect(resolveAnotarSaveKind("idle", "expense")).toBeNull();
    expect(resolveAnotarSaveKind("unknown", "expense")).toBeNull();
  });
});
