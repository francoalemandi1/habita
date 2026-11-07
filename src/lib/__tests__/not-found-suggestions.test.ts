import { describe, expect, it } from "vitest";

import { groupNotFoundSuggestions } from "@habita/domain";

function suggestion(term: string, productName: string) {
  return { term, storeName: "Coto", productName, price: 900, link: "https://www.coto.com.ar/x" };
}

describe("groupNotFoundSuggestions", () => {
  it("groups suggestions under their term, keeping the notFound order", () => {
    const groups = groupNotFoundSuggestions(
      ["pan rallado condimentado", "kiwi organico"],
      [suggestion("kiwi organico", "Kiwi verde"), suggestion("pan rallado condimentado", "Pan rallado Preferido")],
    );

    expect(groups).toEqual([
      { term: "pan rallado condimentado", suggestions: [suggestion("pan rallado condimentado", "Pan rallado Preferido")] },
      { term: "kiwi organico", suggestions: [suggestion("kiwi organico", "Kiwi verde")] },
    ]);
  });

  it("keeps a term with no suggestions so it is still shown as not found", () => {
    expect(groupNotFoundSuggestions(["yerba"], [])).toEqual([{ term: "yerba", suggestions: [] }]);
  });

  it("handles results saved before suggestions existed", () => {
    expect(groupNotFoundSuggestions(["yerba"], undefined)).toEqual([{ term: "yerba", suggestions: [] }]);
  });

  it("drops suggestions for terms that are not in notFound", () => {
    expect(groupNotFoundSuggestions([], [suggestion("leche", "Leche")])).toEqual([]);
  });
});
