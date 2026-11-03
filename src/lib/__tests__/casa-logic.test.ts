import { describe, expect, it } from "vitest";

import {
  buildTransfersBannerText,
  buildWeekLegend,
  checkboxStateForAssignment,
  countCartProducts,
  filterTodayAssignments,
  formatArs,
  formatMonthHeader,
  relativeDaysLabel,
} from "@/components/features/casa/casa-logic";

describe("filterTodayAssignments", () => {
  const today = new Date(2026, 10, 3);

  it("keeps only the current member's non-cancelled tasks due today", () => {
    const assignments = [
      { id: "a", memberId: "me", dueDate: today, status: "PENDING" },
      { id: "b", memberId: "me", dueDate: today, status: "CANCELLED" },
      { id: "c", memberId: "sofi", dueDate: today, status: "PENDING" },
      { id: "d", memberId: "me", dueDate: new Date(2026, 10, 4), status: "PENDING" },
    ];
    expect(filterTodayAssignments(assignments, "me", today).map((a) => a.id)).toEqual(["a"]);
  });
});

describe("checkboxStateForAssignment", () => {
  it("shows an adult's completion as done", () => {
    expect(checkboxStateForAssignment("COMPLETED", "ADULT")).toBe("done");
  });

  it("shows a teen's completion as pending verification", () => {
    expect(checkboxStateForAssignment("COMPLETED", "TEEN")).toBe("toVerify");
    expect(checkboxStateForAssignment("COMPLETED", "CHILD")).toBe("toVerify");
  });

  it("treats VERIFIED as done for everyone", () => {
    expect(checkboxStateForAssignment("VERIFIED", "CHILD")).toBe("done");
  });

  it("treats pending/in-progress/overdue as pending", () => {
    expect(checkboxStateForAssignment("PENDING", "ADULT")).toBe("pending");
    expect(checkboxStateForAssignment("OVERDUE", "ADULT")).toBe("pending");
  });
});

describe("buildWeekLegend", () => {
  it("labels the current member Vos and appends Parejo when even", () => {
    const shares = [
      { name: "Franco", done: 4 },
      { name: "Sofi", done: 4 },
      { name: "Tomi", done: 3 },
    ];
    expect(buildWeekLegend(shares, true)).toBe("Vos 4 · Sofi 4 · Tomi 3 · Parejo");
    expect(buildWeekLegend(shares, false)).toBe("Vos 4 · Sofi 4 · Tomi 3");
  });
});

describe("formatArs", () => {
  it("formats whole pesos with thousands separators", () => {
    expect(formatArs(214800)).toBe("$214.800");
    expect(formatArs(12400.4)).toBe("$12.400");
  });
});

describe("formatMonthHeader", () => {
  it("capitalizes the Spanish month name", () => {
    expect(formatMonthHeader(new Date(2026, 10, 3))).toBe("Noviembre");
  });
});

describe("relativeDaysLabel", () => {
  const now = new Date(2026, 10, 3);

  it("labels same-day as hoy, yesterday as ayer, and older as hace N días", () => {
    expect(relativeDaysLabel(now, now)).toBe("hoy");
    expect(relativeDaysLabel(new Date(2026, 10, 2), now)).toBe("ayer");
    expect(relativeDaysLabel(new Date(2026, 10, 1), now)).toBe("hace 2 días");
  });
});

describe("countCartProducts", () => {
  it("counts a valid array", () => {
    expect(countCartProducts([{ name: "Leche" }, { name: "Pan" }])).toBe(2);
  });

  it("returns 0 for anything that isn't an array", () => {
    expect(countCartProducts(null)).toBe(0);
    expect(countCartProducts({ not: "an array" })).toBe(0);
  });
});

describe("buildTransfersBannerText", () => {
  it("returns null when there's nothing to resolve", () => {
    expect(buildTransfersBannerText([])).toBeNull();
  });

  it("names the task and the sender when there's exactly one", () => {
    expect(buildTransfersBannerText([{ taskName: "Lavar los platos", fromName: "Sofi" }])).toBe(
      "Sofi te quiere pasar «Lavar los platos»",
    );
  });

  it("just counts when there are several", () => {
    expect(
      buildTransfersBannerText([
        { taskName: "a", fromName: "Sofi" },
        { taskName: "b", fromName: "Tomi" },
      ]),
    ).toBe("Tenés 2 pedidos de cambio");
  });
});
