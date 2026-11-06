import { describe, expect, it } from "vitest";
import { formatDayGroupLabel, groupByDueDate } from "./tareas-day-groups";

describe("formatDayGroupLabel", () => {
  it("prefixes HOY for today", () => {
    expect(formatDayGroupLabel(new Date(2025, 10, 4), true)).toBe("HOY · MARTES 4");
  });

  it("omits the prefix otherwise", () => {
    expect(formatDayGroupLabel(new Date(2025, 10, 4), false)).toBe("MARTES 4");
  });
});

describe("groupByDueDate", () => {
  it("buckets items by day and sorts buckets ascending", () => {
    const items = [
      { id: "a", dueDate: "2025-11-05T09:00:00.000Z" },
      { id: "b", dueDate: "2025-11-03T09:00:00.000Z" },
      { id: "c", dueDate: "2025-11-05T18:00:00.000Z" },
    ];

    const groups = groupByDueDate(items);

    expect(groups).toHaveLength(2);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(["b"]);
    expect(groups[1]!.items.map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("returns an empty array for no items", () => {
    expect(groupByDueDate([])).toEqual([]);
  });
});
