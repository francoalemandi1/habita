import { describe, expect, it } from "vitest";

import { expandTermVariants, stemToken, tokenMatches } from "@habita/prices";

describe("stemToken", () => {
  it("strips -s after a vowel", () => {
    expect(stemToken("tomates")).toBe("tomate");
    expect(stemToken("huevos")).toBe("huevo");
    expect(stemToken("papas")).toBe("papa");
  });

  it("strips -es after a consonant that regularly pluralizes with -es", () => {
    expect(stemToken("limones")).toBe("limon");
  });

  it("never touches tokens of 3 chars or less", () => {
    expect(stemToken("pan")).toBe("pan");
    expect(stemToken("mes")).toBe("mes");
  });

  it("leaves non-plural tokens unchanged", () => {
    expect(stemToken("queso")).toBe("queso");
  });
});

describe("tokenMatches", () => {
  it("matches a plural search token against a singular product name", () => {
    expect(tokenMatches("tomates", "tomate perita")).toBe(true);
    expect(tokenMatches("huevos", "huevo blanco")).toBe(true);
  });

  it("matches via a curated synonym", () => {
    expect(tokenMatches("lavandina", "cloro ayudin")).toBe(true);
  });

  it("does not create a false positive between unrelated words", () => {
    expect(tokenMatches("leche", "lechuga criolla")).toBe(false);
  });

  it("still matches an exact substring (existing behavior)", () => {
    expect(tokenMatches("fideos", "fideos matarazzo")).toBe(true);
  });
});

describe("tokenMatches false-positive guards", () => {
  it("does not match a stem inside a longer word (limones vs limonada)", () => {
    expect(tokenMatches("limones", "limonada cepita 1.5 l")).toBe(false);
  });

  it("does not match a synonym inside a longer word (anana vs espinaca)", () => {
    expect(tokenMatches("anana", "espinaca congelada 500g")).toBe(false);
  });

  it("does not treat aji, maiz or refresco as synonyms", () => {
    expect(tokenMatches("morron", "aji molido 50g")).toBe(false);
    expect(tokenMatches("choclo", "harina de maiz polenta 1kg")).toBe(false);
    expect(tokenMatches("gaseosa", "refresco en polvo naranja")).toBe(false);
  });

  it("matches a multi-word synonym only as whole words", () => {
    expect(tokenMatches("coca", "gaseosa cola 2.25 l")).toBe(true);
  });
});

describe("expandTermVariants", () => {
  it("includes the original term plus synonym variants, capped at 3, deduped", () => {
    const variants = expandTermVariants("lavandina");
    expect(variants[0]).toBe("lavandina");
    expect(variants).toContain("cloro");
    expect(variants.length).toBeLessThanOrEqual(3);
    expect(new Set(variants).size).toBe(variants.length);
  });

  it("returns only the original term when it has no synonyms", () => {
    expect(expandTermVariants("queso")).toEqual(["queso"]);
  });
});
