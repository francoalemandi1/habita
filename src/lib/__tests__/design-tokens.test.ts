import { describe, it, expect } from "vitest";
import { colors, darkColors, storeColors } from "@habita/design-tokens";
import { storeColors as webStoreColors } from "../design-tokens";

// §9.1 — exact light/dark values from the rebrand handoff.
const EXPECTED_LIGHT = {
  paper: "#F3EFE7",
  surface: "#FFFDF9",
  line: "#E4DED2",
  lineSoft: "#EEE8DD",
  sand: "#ECE6DA",
  ink: "#1D2620",
  ink2: "#5C665F",
  ink3: "#8D958F",
  monte: "#2E5A45",
  montePressed: "#264B3A",
  monteSoft: "#DCE6DC",
  ladrillo: "#C4553B",
  ladrilloText: "#A23E27",
  ladrilloSoft: "#F5DFD7",
  manteca: "#F0D488",
  mantecaSoft: "#FAF0CF",
  mantecaText: "#6B5310",
  scrim: "rgba(29,38,32,.4)",
};

const EXPECTED_DARK = {
  paper: "#121813",
  surface: "#1B231D",
  line: "#2A352E",
  lineSoft: "#232C25",
  sand: "#232C25",
  ink: "#ECE6DA",
  ink2: "#A3ACA5",
  ink3: "#7A847D",
  monte: "#7DB394",
  montePressed: "#6A9E80",
  monteSoft: "#1F3329",
  ladrillo: "#E8866E",
  ladrilloText: "#E8866E",
  ladrilloSoft: "#3A2420",
  manteca: "#F0D488",
  mantecaSoft: "#3A3320",
  mantecaText: "#F0D488",
  scrim: "rgba(0,0,0,.6)",
};

const OLD_BRAND_HEXES = ["#5260fe", "#d2ffa0", "#d0b6ff", "#fff7ea"];

/** Walks an object/array recursively, collecting every string value found. */
function collectStrings(value: unknown, acc: string[] = []): string[] {
  if (typeof value === "string") {
    acc.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, acc);
  } else if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, acc);
  }
  return acc;
}

describe("design-tokens — §9.1 colors", () => {
  it("matches the exact light values from the handoff", () => {
    expect(colors).toEqual(EXPECTED_LIGHT);
  });

  it("matches the exact dark values from the handoff", () => {
    expect(darkColors).toEqual(EXPECTED_DARK);
  });
});

describe("design-tokens — storeColors stays unchanged (third-party brand colors)", () => {
  it("keeps Carrefour's real brand color", () => {
    expect(storeColors.Carrefour).toEqual({ bg: "#003da5", text: "#ffffff" });
    expect(webStoreColors.Carrefour).toEqual({ bg: "#003da5", text: "#ffffff" });
  });
});

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red = 0, green = 0, blue = 0] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

describe("design-tokens — store badges stay readable (WCAG AA for 12px text)", () => {
  it.each(Object.entries(storeColors))("%s reaches 4.5:1", (_store, { bg, text }) => {
    expect(contrastRatio(bg, text)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the web mirror identical to the shared package", () => {
    expect(webStoreColors).toEqual(storeColors);
  });
});

describe("design-tokens — no old-brand hex remains outside storeColors", () => {
  // storeColors intentionally keeps third-party brand hexes (e.g. "Coop. Obrera"
  // historically shares #5260fe with the old primary by coincidence) and is excluded.
  const exported = { colors, darkColors };

  it.each(OLD_BRAND_HEXES)("does not contain %s", (hex) => {
    const strings = collectStrings(exported).map((s) => s.toLowerCase());
    expect(strings).not.toContain(hex.toLowerCase());
  });
});
