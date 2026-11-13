import { describe, expect, it } from "vitest";

import { parsePackCount } from "../unit-parser";

describe("parsePackCount", () => {
  it("reads a trailing 'N Ud.' count", () => {
    expect(parsePackCount("Huevo Blanco Grande 6 Ud.")).toBe(6);
  });

  it("picks the count next to 'Ud.', not an unrelated measurement earlier in the name", () => {
    expect(parsePackCount("Papel Higiénico Simple Hoja 80mts 2 Ud.")).toBe(2);
  });

  it("reads 'x N un'", () => {
    expect(parsePackCount("Huevos Color x 30 un")).toBe(30);
  });

  it("reads the 'uni' / 'uds' / 'unidad' spellings stores use", () => {
    expect(parsePackCount("Huevos blancos grandes Granja almeyra carton 6 uni")).toBe(6);
    expect(parsePackCount("Velas 12 uds")).toBe(12);
    expect(parsePackCount("Esponja 3 unidad")).toBe(3);
  });

  it("reads 'N x size' as N items", () => {
    expect(parsePackCount("Papel Higienico Simple Hoja 4 X 80 M Elegante")).toBe(4);
    expect(parsePackCount("Papel Higienico Doble Hoja 4x30 M Family Care")).toBe(4);
    expect(parsePackCount("Papel Higienico Elegante Simple Hoja 4x30m")).toBe(4);
    expect(parsePackCount("Papel Higienico Felpita Doble Hoja 4x20")).toBe(4);
  });

  it("does not read a '2x1' promo as a pack", () => {
    expect(parsePackCount("Gaseosa Cola 2x1")).toBeNull();
  });

  it("reads a leading 'Pack N' count", () => {
    expect(parsePackCount("Pack 6 Latas Cerveza 473 ml")).toBe(6);
  });

  it("reads a bare 'xN' count with no unit keyword", () => {
    expect(parsePackCount("Yogur x6")).toBe(6);
  });

  it("does not mistake a non-count qualifier like '4 Flex' for a pack count", () => {
    expect(parsePackCount("Yerba Mate Taragüi 4 Flex 1 Kg.")).toBeNull();
  });

  it("returns null for a weight-only product (liters)", () => {
    expect(parsePackCount("Leche Entera DIA Sachet 1 Lt.")).toBeNull();
  });

  it("returns null for a weight-only product (milliliters)", () => {
    expect(parsePackCount("Aceite 900 Ml.")).toBeNull();
  });

  it("returns null for a weight-only product (grams)", () => {
    expect(parsePackCount("Fideos Tirabuzón 500 g")).toBeNull();
  });

  it("returns null when the declared count is 1", () => {
    expect(parsePackCount("x 1 un")).toBeNull();
  });

  it("returns null for a count above the noise threshold", () => {
    expect(parsePackCount("Servilletas 500 Ud.")).toBeNull();
  });

  it("does not treat a weight token right after the number as a count ('x 500 g')", () => {
    expect(parsePackCount("Agua Saborizada x 500 g")).toBeNull();
  });

  it("does not treat a weight token right after the number as a count ('x1kg')", () => {
    expect(parsePackCount("Arroz x1kg")).toBeNull();
  });
});
