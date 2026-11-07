export interface NearMissProduct {
  term: string;
  storeName: string;
  productName: string;
  price: number;
  link: string;
}

export interface NotFoundTermGroup<TProduct extends NearMissProduct> {
  term: string;
  suggestions: TProduct[];
}

/**
 * One group per term no store found, in the order the user listed them, each
 * with its near-miss products (possibly none). Suggestions for terms that are
 * no longer in `notFound` are dropped.
 */
export function groupNotFoundSuggestions<TProduct extends NearMissProduct>(
  notFound: readonly string[],
  suggestions: readonly TProduct[] | undefined,
): NotFoundTermGroup<TProduct>[] {
  return notFound.map((term) => ({
    term,
    suggestions: (suggestions ?? []).filter((suggestion) => suggestion.term === term),
  }));
}
