/**
 * "Open cart" deep links for VTEX-backed stores: a `?sku=&qty=&seller=` URL
 * that fills the user's own browser cart, built from the products the user
 * ends up with after swaps (not the raw search results).
 *
 * Only Carrefour, Dia, Mas Online (VTEX Intelligent Search) and Cordiez,
 * Toledo (VTEX Legacy) support it; Disco, Vea, Jumbo (Cencosud) and Coto,
 * Coop. Obrera don't, so they're absent from this map.
 */

import type { StoreCartRef } from "./product-matching";

export const CART_ADD_STORE_BASE_URLS: Readonly<Record<string, string>> = {
  Carrefour: "https://www.carrefour.com.ar",
  Dia: "https://diaonline.supermercadosdia.com.ar",
  "Mas Online": "https://www.masonline.com.ar",
  Cordiez: "https://www.cordiez.com.ar",
  Toledo: "https://www.toledodigital.com.ar",
};

export interface StoreCartLink {
  url: string;
  includedCount: number;
  totalCount: number;
}

interface CartLinkProduct {
  cartRef?: StoreCartRef | null;
  quantity: number;
}

/**
 * Carrefour pairs the `sku` and `qty` lists only after sorting each one on its
 * own (skus as strings, quantities ascending), so a multi-product link lands
 * with quantities on the wrong products. Verified live 2026-11-09; the other
 * supported stores keep the triples in order.
 */
const STORES_SORTING_CART_PARAMS: ReadonlySet<string> = new Set(["Carrefour"]);

type RefProduct = CartLinkProduct & { cartRef: StoreCartRef };

function toSafeQuantity(quantity: number): number {
  return Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
}

/** Plain code-unit order, the order Carrefour applies to sku ids (not numeric). */
function compareSkuIds(a: RefProduct, b: RefProduct): number {
  if (a.cartRef.skuId === b.cartRef.skuId) return 0;
  return a.cartRef.skuId < b.cartRef.skuId ? -1 : 1;
}

/** True when sorting skus and quantities independently still pairs every sku with its own quantity. */
function survivesIndependentSort(products: RefProduct[]): boolean {
  const sortedBySku = [...products].sort(compareSkuIds);
  return sortedBySku.every(
    (product, index) => index === 0 || toSafeQuantity(sortedBySku[index - 1]?.quantity ?? 1) <= toSafeQuantity(product.quantity),
  );
}

/**
 * Build a "fill my cart" URL for the products that carry a cartRef. Null if the
 * store is unsupported, none carry a ref, or the store would scramble the
 * quantities (the per-product links still cover that case).
 */
export function buildStoreCartUrl(storeName: string, products: CartLinkProduct[]): StoreCartLink | null {
  const baseUrl = CART_ADD_STORE_BASE_URLS[storeName];
  if (!baseUrl) return null;

  const included = products.filter((product): product is RefProduct => product.cartRef != null);
  if (included.length === 0) return null;
  if (STORES_SORTING_CART_PARAMS.has(storeName) && !survivesIndependentSort(included)) return null;

  const params = new URLSearchParams();
  for (const product of included) {
    params.append("sku", product.cartRef.skuId);
    params.append("qty", String(toSafeQuantity(product.quantity)));
    params.append("seller", product.cartRef.sellerId);
  }
  params.append("sc", "1");

  return {
    url: `${baseUrl}/checkout/cart/add?${params.toString()}`,
    includedCount: included.length,
    totalCount: products.length,
  };
}
