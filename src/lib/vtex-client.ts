/**
 * Supermarket search client for Argentine stores.
 *
 * Supports multiple platforms:
 * - VTEX Intelligent Search REST (Carrefour, Dia, Disco, Vea, Mas Online)
 * - VTEX Legacy REST (Jumbo, Cordiez, Toledo)
 * - Oracle ATG/Endeca (Coto)
 * - Be2 custom API (Cooperativa Obrera)
 *
 * Every response is zod-validated: a format change marks the store as failed
 * instead of reading as "no products".
 */

import { z } from "zod";

import type { Limiter } from "@/lib/concurrency";

// ============================================
// Types
// ============================================

export interface VtexProduct {
  productName: string;
  price: number;
  listPrice: number | null;
  link: string;
  imageUrl: string | null;
}

export interface StoreConfig {
  name: string;
  baseUrl: string;
  type: "vtex" | "vtex-legacy" | "coto" | "coope";
  /**
   * null = siempre visible (sin ciudad configurada en el hogar).
   * Array = visible solo si city contiene algún token (sin tildes, minúsculas).
   */
  regions: string[] | null;
}

export interface StoreSearchResult {
  storeName: string;
  products: VtexProduct[];
  failed: boolean;
}

// ============================================
// Store configuration
// ============================================

export const SUPERMARKET_STORES: StoreConfig[] = [
  // Cadenas nacionales — con cobertura real por ciudad/provincia
  {
    name: "Carrefour",
    baseUrl: "https://www.carrefour.com.ar",
    type: "vtex",
    // Presencia física en GBA, CABA y principales ciudades del interior
    regions: [
      "buenos aires", "caba", "capital federal",
      "cordoba", "rosario", "santa fe", "mendoza", "tucuman",
      "mar del plata", "la plata", "quilmes", "lomas de zamora",
      "lanus", "avellaneda", "san justo", "moron", "merlo",
      "tigre", "san isidro", "vicente lopez", "san martin",
      "tres de febrero", "hurlingham", "ituzaingo", "ezeiza",
      "florencio varela", "berazategui", "quilmes", "almirante brown",
      "lomas de zamora", "esteban echeverria", "canuelas",
      "pilar", "escobar", "campana", "zarate", "lujan",
      "san miguel", "jose c paz", "malvinas argentinas",
      "bahia blanca", "neuquen", "salta", "jujuy", "corrientes",
      "posadas", "resistencia", "san juan", "san luis",
    ],
  },
  {
    name: "Coto",
    baseUrl: "https://www.cotodigital.com.ar",
    type: "coto",
    // Coto opera casi exclusivamente en GBA y CABA
    regions: [
      "buenos aires", "caba", "capital federal",
      "la plata", "quilmes", "lomas de zamora", "lanus", "avellaneda",
      "san justo", "moron", "merlo", "tigre", "san isidro",
      "vicente lopez", "san martin", "tres de febrero", "hurlingham",
      "ituzaingo", "ezeiza", "florencio varela", "berazategui",
      "almirante brown", "lomas de zamora", "esteban echeverria",
      "pilar", "escobar", "san miguel", "jose c paz",
      "malvinas argentinas", "mar del plata",
    ],
  },
  {
    name: "Dia",
    baseUrl: "https://diaonline.supermercadosdia.com.ar",
    type: "vtex",
    // Dia tiene presencia muy amplia en Argentina
    regions: [
      "buenos aires", "caba", "capital federal",
      "cordoba", "rosario", "santa fe", "mendoza", "tucuman",
      "mar del plata", "la plata", "bahia blanca", "neuquen",
      "quilmes", "lomas de zamora", "lanus", "avellaneda",
      "san justo", "moron", "merlo", "tigre", "san isidro",
      "vicente lopez", "san martin", "tres de febrero",
      "pilar", "escobar", "san miguel", "jose c paz",
      "florencio varela", "berazategui", "almirante brown",
      "esteban echeverria", "canuelas", "lujan",
      "salta", "jujuy", "san juan", "san luis",
      "corrientes", "posadas", "resistencia",
      "santa rosa", "rio cuarto", "villa maria", "villa carlos paz",
    ],
  },
  {
    name: "Disco",
    baseUrl: "https://www.disco.com.ar",
    type: "vtex",
    // Disco/Vea son del grupo Cencosud — principalmente GBA Norte y CABA
    regions: [
      "buenos aires", "caba", "capital federal",
      "san isidro", "vicente lopez", "tigre", "escobar", "pilar",
      "san martin", "tres de febrero", "moron", "ituzaingo",
      "la plata", "mar del plata", "bahia blanca",
      "mendoza", "neuquen",
    ],
  },
  {
    name: "Jumbo",
    baseUrl: "https://www.jumbo.com.ar",
    type: "vtex-legacy",
    // Jumbo tiene pocas sucursales, concentradas en ciudades grandes
    regions: [
      "buenos aires", "caba", "capital federal",
      "la plata", "mar del plata",
      "cordoba", "rosario", "mendoza", "neuquen",
      "tigre", "pilar", "san isidro", "vicente lopez",
      "moron", "lomas de zamora",
    ],
  },
  {
    name: "Mas Online",
    baseUrl: "https://www.masonline.com.ar",
    type: "vtex",
    // Mas Online (Cencosud) — GBA y CABA
    regions: [
      "buenos aires", "caba", "capital federal",
      "la plata", "quilmes", "lomas de zamora", "lanus", "avellaneda",
      "san justo", "moron", "merlo", "tigre", "san isidro",
      "vicente lopez", "san martin", "tres de febrero",
      "pilar", "escobar", "florencio varela", "berazategui",
      "almirante brown",
    ],
  },
  {
    name: "Vea",
    baseUrl: "https://www.vea.com.ar",
    type: "vtex",
    // Vea (Cencosud) — GBA y algunas ciudades del interior
    regions: [
      "buenos aires", "caba", "capital federal",
      "cordoba", "mendoza", "rosario", "san juan", "san luis",
      "tucuman", "salta", "neuquen", "bahia blanca",
      "mar del plata", "la plata",
      "tigre", "pilar", "moron", "lomas de zamora",
    ],
  },
  // Regionales
  { name: "Cordiez", baseUrl: "https://www.cordiez.com.ar", type: "vtex-legacy", regions: ["cordoba"] },
  { name: "Toledo", baseUrl: "https://www.toledodigital.com.ar", type: "vtex-legacy", regions: ["mar del plata", "necochea", "miramar"] },
  { name: "Coop. Obrera", baseUrl: "https://api.lacoopeencasa.coop", type: "coope", regions: ["bahia blanca", "neuquen", "comodoro", "trelew", "rio gallegos"] },
];

// ============================================
// In-memory cache (4-hour TTL)
// ============================================

const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const searchCache = new Map<string, CacheEntry<VtexProduct[]>>();

function getCached(key: string): VtexProduct[] | null {
  const entry = searchCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: VtexProduct[]) {
  searchCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ============================================
// List price validation
// ============================================

/** Discard listPrice if it's implausibly higher than the selling price. */
const MAX_LIST_PRICE_MULTIPLIER = 3;

function sanitizeListPrice(price: number, listPrice: number): number | null {
  if (listPrice <= price) return null;
  if (listPrice > price * MAX_LIST_PRICE_MULTIPLIER) return null;
  return listPrice;
}

// ============================================
// Shared request + parsing
// ============================================

const STORE_REQUEST_TIMEOUT_MS = 10_000;

const STORE_REQUEST_HEADERS = {
  // VTEX Intelligent Search answers 429 to generic "...Bot" user agents, so identify honestly without it.
  "User-Agent": "Mozilla/5.0 (compatible; Habita/1.0; +https://habita.app)",
  Accept: "application/json",
};

async function fetchStoreJson(storeName: string, url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: STORE_REQUEST_HEADERS,
    signal: AbortSignal.timeout(STORE_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${storeName} request failed: ${response.status}`);
  return response.json();
}

/**
 * Throws when a store changes its response format, so the store is reported
 * as `failed` instead of silently returning zero products.
 */
function parseStoreResponse<T>(storeName: string, schema: z.ZodType<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`${storeName} returned an unexpected response shape at ${issue?.path.join(".") ?? "?"}: ${issue?.message ?? "unknown"}`);
  }
  return parsed.data;
}

async function withSearchCache(cacheKey: string, search: () => Promise<VtexProduct[]>): Promise<VtexProduct[]> {
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const products = await search();
  setCache(cacheKey, products);
  return products;
}

const MAX_PRODUCTS_PER_STORE = 6;

// ============================================
// VTEX Intelligent Search REST (Carrefour, Dia, Disco, Vea, Mas Online)
// ============================================

const intelligentSearchResponseSchema = z.object({
  products: z.array(
    z.object({
      productName: z.string(),
      linkText: z.string(),
      priceRange: z.object({
        sellingPrice: z.object({ lowPrice: z.number() }),
        listPrice: z.object({ lowPrice: z.number() }),
      }),
      items: z.array(z.object({ images: z.array(z.object({ imageUrl: z.string() })) })),
    }),
  ),
});

export function parseIntelligentSearchProducts(store: StoreConfig, payload: unknown): VtexProduct[] {
  const { products } = parseStoreResponse(store.name, intelligentSearchResponseSchema, payload);
  return products
    .filter((product) => product.priceRange.sellingPrice.lowPrice > 0)
    .map((product) => {
      const price = product.priceRange.sellingPrice.lowPrice;
      return {
        productName: product.productName,
        price,
        listPrice: sanitizeListPrice(price, product.priceRange.listPrice.lowPrice),
        link: `${store.baseUrl}/${product.linkText}/p`,
        imageUrl: product.items[0]?.images[0]?.imageUrl ?? null,
      };
    });
}

function searchVtexStore(store: StoreConfig, query: string): Promise<VtexProduct[]> {
  return withSearchCache(`vtex:${store.name}:${query.toLowerCase()}`, async () => {
    const params = new URLSearchParams({
      query,
      count: String(MAX_PRODUCTS_PER_STORE),
      hideUnavailableItems: "true",
      locale: "es-AR",
    });
    const url = `${store.baseUrl}/api/io/_v/api/intelligent-search/product_search/?${params.toString()}`;
    return parseIntelligentSearchProducts(store, await fetchStoreJson(store.name, url));
  });
}

// ============================================
// VTEX Legacy REST (Jumbo, Cordiez, Toledo)
// ============================================

const legacySearchResponseSchema = z.array(
  z.object({
    productName: z.string(),
    link: z.string(),
    items: z.array(
      z.object({
        images: z.array(z.object({ imageUrl: z.string() })),
        sellers: z.array(
          z.object({
            commertialOffer: z.object({ Price: z.number(), ListPrice: z.number(), IsAvailable: z.boolean() }),
          }),
        ),
      }),
    ),
  }),
);

export function parseVtexLegacyProducts(store: StoreConfig, payload: unknown): VtexProduct[] {
  const rawProducts = parseStoreResponse(store.name, legacySearchResponseSchema, payload);
  return rawProducts.flatMap((product) => {
    const firstItem = product.items[0];
    const offer = firstItem?.sellers[0]?.commertialOffer;
    if (!firstItem || !offer?.IsAvailable || offer.Price <= 0) return [];
    return [
      {
        productName: product.productName,
        price: offer.Price,
        listPrice: sanitizeListPrice(offer.Price, offer.ListPrice),
        link: product.link.startsWith("http") ? product.link : `${store.baseUrl}${product.link}`,
        imageUrl: firstItem.images[0]?.imageUrl ?? null,
      },
    ];
  });
}

/**
 * Unordered legacy search returns loose text hits first (Toledo "leche" → kettles,
 * flan, dessert); ordering by top sales brings the staple product itself up.
 */
export function buildVtexLegacySearchUrl(store: StoreConfig, query: string): string {
  return `${store.baseUrl}/api/catalog_system/pub/products/search/?ft=${encodeURIComponent(query)}&_from=0&_to=5&O=OrderByTopSaleDESC`;
}

function searchVtexLegacy(store: StoreConfig, query: string): Promise<VtexProduct[]> {
  return withSearchCache(`vtex-legacy:${store.name}:${query.toLowerCase()}`, async () => {
    return parseVtexLegacyProducts(store, await fetchStoreJson(store.name, buildVtexLegacySearchUrl(store, query)));
  });
}

// ============================================
// Coto (Oracle ATG/Endeca)
// ============================================

const COTO_BASE_URL = "https://www.coto.com.ar";
const COTO_STORE_NAME = "Coto";

const cotoAttributesSchema = z.record(z.unknown());

const cotoRecordSchema = z.object({
  attributes: cotoAttributesSchema,
  detailsAction: z.object({ recordState: z.string().nullish() }).nullish(),
  // Since late 2026 the SKU price lives in a nested record, not on the product record.
  records: z.array(z.object({ attributes: cotoAttributesSchema })).nullish(),
});

const cotoResponseSchema = z.object({ contents: z.array(z.unknown()) });

const MAX_COTO_SEARCH_DEPTH = 8;

function firstAttribute(attributes: Record<string, unknown>, key: string): string | null {
  const value = attributes[key];
  if (!Array.isArray(value)) return null;
  const first: unknown = value[0];
  return typeof first === "string" ? first : null;
}

function isCotoProductRecord(candidate: unknown): boolean {
  const parsed = cotoRecordSchema.safeParse(candidate);
  return parsed.success && firstAttribute(parsed.data.attributes, "product.displayName") !== null;
}

/** Endeca nests the result list at a layout-dependent depth; find the first `records` array of products. */
function findCotoRecords(node: unknown, depth: number): unknown[] | null {
  if (depth > MAX_COTO_SEARCH_DEPTH || node === null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findCotoRecords(child, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const records: unknown = Reflect.get(node, "records");
  if (Array.isArray(records) && records.some(isCotoProductRecord)) return records;
  for (const child of Object.values(node)) {
    const found = findCotoRecords(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function parseCotoRecord(candidate: unknown): VtexProduct | null {
  const parsed = cotoRecordSchema.safeParse(candidate);
  if (!parsed.success) return null;
  const { attributes, detailsAction, records } = parsed.data;
  const skuAttributes = records?.[0]?.attributes ?? attributes;

  const productName = firstAttribute(attributes, "product.displayName");
  const price = Number.parseFloat(firstAttribute(skuAttributes, "sku.activePrice") ?? "");
  if (!productName || !Number.isFinite(price) || price <= 0) return null;

  const recordState = detailsAction?.recordState?.split("?")[0] ?? "";
  const repositoryId = firstAttribute(attributes, "product.repositoryId") ?? "";
  const imageUrl = firstAttribute(skuAttributes, "product.mediumImage.url");

  return {
    productName,
    price,
    // Coto no longer exposes a comparable list price per record.
    listPrice: null,
    link: recordState ? `${COTO_BASE_URL}/productos${recordState}` : `${COTO_BASE_URL}/productos/-/${repositoryId}`,
    imageUrl: imageUrl && !imageUrl.startsWith("http") ? `${COTO_BASE_URL}${imageUrl}` : imageUrl,
  };
}

export function parseCotoProducts(payload: unknown): VtexProduct[] {
  const envelope = parseStoreResponse(COTO_STORE_NAME, cotoResponseSchema, payload);
  const records = findCotoRecords(envelope.contents, 0) ?? [];
  return records.flatMap((record) => parseCotoRecord(record) ?? []).slice(0, MAX_PRODUCTS_PER_STORE);
}

function searchCoto(query: string): Promise<VtexProduct[]> {
  return withSearchCache(`coto:${query.toLowerCase()}`, async () => {
    const params = new URLSearchParams({ Ntt: query, Nrpp: String(MAX_PRODUCTS_PER_STORE), No: "0", format: "json" });
    const url = `${COTO_BASE_URL}/sitios/cdigi/categoria?${params.toString()}`;
    return parseCotoProducts(await fetchStoreJson(COTO_STORE_NAME, url));
  });
}

// ============================================
// Cooperativa Obrera (Be2 API)
// ============================================

const COOPE_STORE_NAME = "Coop. Obrera";
const COOPE_SITE_URL = "https://www.lacoopeencasa.coop";

/** Be2 API status codes: 1 = results, 2 = accepted with no results. Anything else is an error. */
const COOPE_OK_STATUSES = new Set([1, 2]);

const coopeResponseSchema = z.object({
  estado: z.number(),
  mensaje: z.string().nullish(),
  datos: z
    .array(
      z.object({
        cod_interno: z.string(),
        descripcion: z.string(),
        precio: z.string(),
        precio_anterior: z.string().nullish(),
        imagen: z.string().nullish(),
      }),
    )
    .nullish(),
});

function slugifyCoopeDescription(description: string): string {
  return description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseCoopeProducts(payload: unknown): VtexProduct[] {
  const response = parseStoreResponse(COOPE_STORE_NAME, coopeResponseSchema, payload);
  if (!COOPE_OK_STATUSES.has(response.estado)) {
    throw new Error(`${COOPE_STORE_NAME} returned status ${response.estado}: ${response.mensaje ?? "no message"}`);
  }
  return (response.datos ?? []).slice(0, MAX_PRODUCTS_PER_STORE).flatMap((article) => {
    const price = Number.parseFloat(article.precio);
    if (!Number.isFinite(price) || price <= 0) return [];
    const previousPrice = Number.parseFloat(article.precio_anterior ?? "");
    return [
      {
        productName: article.descripcion,
        price,
        listPrice: Number.isFinite(previousPrice) ? sanitizeListPrice(price, previousPrice) : null,
        link: `${COOPE_SITE_URL}/producto/${slugifyCoopeDescription(article.descripcion)}/${article.cod_interno}`,
        imageUrl: article.imagen ?? null,
      },
    ];
  });
}

function searchCoopObrera(query: string): Promise<VtexProduct[]> {
  return withSearchCache(`coope:${query.toLowerCase()}`, async () => {
    const params = new URLSearchParams({ q: query, offset: "0", pedido: "1" });
    const url = `https://api.lacoopeencasa.coop/api/buscar/articulos?${params.toString()}`;
    return parseCoopeProducts(await fetchStoreJson(COOPE_STORE_NAME, url));
  });
}

// ============================================
// Public API
// ============================================

/**
 * Search a single store for a product term.
 * Lets fetch/parse errors propagate so `searchAllStores` can mark the store
 * as `failed` for this term, instead of silently reporting "no products".
 */
export async function searchStore(store: StoreConfig, query: string): Promise<VtexProduct[]> {
  switch (store.type) {
    case "vtex":
      return searchVtexStore(store, query);
    case "vtex-legacy":
      return searchVtexLegacy(store, query);
    case "coto":
      return searchCoto(query);
    case "coope":
      return searchCoopObrera(query);
  }
}

/** Filter stores by household city. National stores always included; regional only if city matches. */
export function getStoresForCity(city: string | null): StoreConfig[] {
  if (!city) return SUPERMARKET_STORES;
  const normalizedCity = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return SUPERMARKET_STORES.filter((store) => {
    if (!store.regions) return true;
    return store.regions.some((region) => normalizedCity.includes(region));
  });
}

/**
 * Search all applicable stores for a product term, in parallel.
 *
 * `limiter` is optional and shared by the caller across every term in a
 * batch, to bound total outbound requests (see MAX_CONCURRENT_STORE_REQUESTS
 * in supermarket-search.ts). Callers that don't pass one keep today's
 * unbounded fan-out per term.
 */
export async function searchAllStores(
  query: string,
  city?: string | null,
  limiter?: Limiter,
): Promise<StoreSearchResult[]> {
  const stores = city !== undefined ? getStoresForCity(city) : SUPERMARKET_STORES;

  const results = await Promise.allSettled(
    stores.map(async (store) => {
      const products = limiter
        ? await limiter.run(() => searchStore(store, query))
        : await searchStore(store, query);
      return { storeName: store.name, products, failed: false } satisfies StoreSearchResult;
    }),
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return { storeName: stores[i]!.name, products: [], failed: true };
  });
}
