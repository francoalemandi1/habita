/**
 * Supermarket search client for Argentine stores.
 *
 * Supports multiple platforms:
 * - VTEX Intelligent Search (Carrefour, Dia, Disco, Vea, Mas Online)
 * - VTEX Legacy REST (Jumbo, HiperLibertad)
 * - Oracle ATG/Endeca (Coto)
 * - Be2 custom API (Cooperativa Obrera)
 *
 * VTEX uses a hardcoded persisted-query hash (public, doesn't require auth).
 * To find a new hash: DevTools → Network → search on carrefour.com.ar →
 * filter "productSuggestions" → copy sha256Hash from the extensions param.
 */

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
  /** null = nacional (siempre visible). Array = solo si city contiene algún token. */
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
  // Nacionales
  { name: "Carrefour", baseUrl: "https://www.carrefour.com.ar", type: "vtex", regions: null },
  { name: "Coto", baseUrl: "https://www.cotodigital.com.ar", type: "coto", regions: null },
  { name: "Dia", baseUrl: "https://diaonline.supermercadosdia.com.ar", type: "vtex", regions: null },
  { name: "Disco", baseUrl: "https://www.disco.com.ar", type: "vtex", regions: null },
  { name: "Jumbo", baseUrl: "https://www.jumbo.com.ar", type: "vtex-legacy", regions: null },
  { name: "Mas Online", baseUrl: "https://www.masonline.com.ar", type: "vtex", regions: null },
  { name: "Vea", baseUrl: "https://www.vea.com.ar", type: "vtex", regions: null },
  // Regionales
  { name: "HiperLibertad", baseUrl: "https://www.hiperlibertad.com.ar", type: "vtex-legacy", regions: ["cordoba", "mendoza", "tucuman", "rosario", "santa fe"] },
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
// VTEX Intelligent Search
// ============================================

/** VTEX GraphQL response shape (only fields we need). */
interface VtexGraphQLResponse {
  data?: {
    productSuggestions?: {
      products: Array<{
        productName: string;
        linkText: string;
        priceRange: {
          sellingPrice: { lowPrice: number };
          listPrice: { lowPrice: number };
        };
        items: Array<{
          images: Array<{ imageUrl: string }>;
        }>;
      }>;
    };
  };
}

async function searchVtexStore(
  store: StoreConfig,
  query: string,
  sha256Hash: string,
): Promise<VtexProduct[]> {
  const cacheKey = `vtex:${store.name}:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const variables = {
    productOriginVtex: true,
    simulationBehavior: "default",
    hideUnavailableItems: true,
    fullText: query,
    count: 6,
    shippingOptions: [],
    variant: null,
  };

  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash,
      sender: "vtex.store-resources@0.x",
      provider: "vtex.search-graphql@0.x",
    },
    variables: Buffer.from(JSON.stringify(variables)).toString("base64"),
  };

  const params = new URLSearchParams({
    workspace: "master",
    maxAge: "medium",
    appsEtag: "remove",
    domain: "store",
    locale: "es-AR",
    operationName: "productSuggestions",
    variables: "{}",
    extensions: JSON.stringify(extensions),
  });

  const url = `${store.baseUrl}/_v/segment/graphql/v1/?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; HabitaBot/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) return [];

  const json = (await response.json()) as VtexGraphQLResponse;
  const rawProducts = json.data?.productSuggestions?.products ?? [];

  const products: VtexProduct[] = rawProducts.map((p) => ({
    productName: p.productName,
    price: p.priceRange.sellingPrice.lowPrice,
    listPrice: sanitizeListPrice(
      p.priceRange.sellingPrice.lowPrice,
      p.priceRange.listPrice.lowPrice,
    ),
    link: `${store.baseUrl}/${p.linkText}/p`,
    imageUrl: p.items[0]?.images[0]?.imageUrl ?? null,
  }));

  setCache(cacheKey, products);
  return products;
}

// ============================================
// VTEX Legacy REST (Jumbo, HiperLibertad)
// ============================================

interface VtexLegacyProduct {
  productName: string;
  link: string;
  items: Array<{
    images: Array<{ imageUrl: string }>;
    sellers: Array<{
      commertialOffer: {
        Price: number;
        ListPrice: number;
        IsAvailable: boolean;
      };
    }>;
  }>;
}

async function searchVtexLegacy(store: StoreConfig, query: string): Promise<VtexProduct[]> {
  const cacheKey = `vtex-legacy:${store.name}:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `${store.baseUrl}/api/catalog_system/pub/products/search/?ft=${encodeURIComponent(query)}&_from=0&_to=5`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; HabitaBot/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) return [];

  const rawProducts = (await response.json()) as VtexLegacyProduct[];

  const products: VtexProduct[] = rawProducts
    .filter((p) => {
      const seller = p.items[0]?.sellers[0];
      return seller?.commertialOffer.IsAvailable && seller.commertialOffer.Price > 0;
    })
    .map((p) => {
      const offer = p.items[0]!.sellers[0]!.commertialOffer;
      return {
        productName: p.productName,
        price: offer.Price,
        listPrice: sanitizeListPrice(offer.Price, offer.ListPrice),
        link: p.link.startsWith("http") ? p.link : `${store.baseUrl}${p.link}`,
        imageUrl: p.items[0]?.images[0]?.imageUrl ?? null,
      };
    });

  setCache(cacheKey, products);
  return products;
}

// ============================================
// Coto (Oracle ATG/Endeca)
// ============================================

interface CotoEndecaResponse {
  contents?: Array<{
    Main?: Array<{
      records?: Array<{
        attributes: {
          "product.displayName"?: string[];
          "sku.activePrice"?: string[];
          "sku.listPrice"?: string[];
          "product.repositoryId"?: string[];
          "product.mediumImage.url"?: string[];
        };
        detailsAction?: {
          recordState?: string;
        };
      }>;
    }>;
  }>;
}

async function searchCoto(query: string): Promise<VtexProduct[]> {
  const cacheKey = `coto:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    Ntt: query,
    Nrpp: "6",
    No: "0",
    format: "json",
  });

  const url = `https://www.cotodigital.com.ar/sitios/cdigi/categoria?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; HabitaBot/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) return [];

  const json = (await response.json()) as CotoEndecaResponse;

  // Endeca nests records inside contents[0].Main — find the section with records
  const mainSections = json.contents?.[0]?.Main ?? [];
  const recordSection = mainSections.find((s) => s?.records && s.records.length > 0);
  const records = recordSection?.records ?? [];

  const products: VtexProduct[] = [];

  for (const record of records) {
    const attrs = record.attributes;
    const name = attrs["product.displayName"]?.[0];
    const priceStr = attrs["sku.activePrice"]?.[0];

    if (!name || !priceStr) continue;

    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) continue;

    const listPriceStr = attrs["sku.listPrice"]?.[0];
    const rawListPrice = listPriceStr ? parseFloat(listPriceStr) : null;
    const listPrice = rawListPrice ? sanitizeListPrice(price, rawListPrice) : null;

    // Build product URL from recordState or repositoryId
    const recordState = record.detailsAction?.recordState ?? "";
    const repoId = attrs["product.repositoryId"]?.[0] ?? "";
    const link = recordState
      ? `https://www.cotodigital.com.ar/sitios/cdigi/producto${recordState}`
      : `https://www.cotodigital.com.ar/sitios/cdigi/producto/-/${repoId}`;

    const imageUrl = attrs["product.mediumImage.url"]?.[0]
      ? `https://www.cotodigital.com.ar${attrs["product.mediumImage.url"][0]}`
      : null;

    products.push({ productName: name, price, listPrice, link, imageUrl });
  }

  setCache(cacheKey, products);
  return products;
}

// ============================================
// Cooperativa Obrera (Be2 API)
// ============================================

interface CoopObreraResponse {
  articulos?: Array<{
    descripcion?: string;
    precio?: number;
    precioAnterior?: number;
    slug?: string;
    foto?: string;
  }>;
}

async function searchCoopObrera(query: string): Promise<VtexProduct[]> {
  const cacheKey = `coope:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    q: query,
    offset: "0",
    pedido: "1",
  });

  const url = `https://api.lacoopeencasa.coop/api/buscar/articulos?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; HabitaBot/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) return [];

  const json = (await response.json()) as CoopObreraResponse;
  const rawProducts = json.articulos ?? [];

  const products: VtexProduct[] = [];

  for (const item of rawProducts.slice(0, 6)) {
    const name = item.descripcion;
    const price = item.precio;

    if (!name || !price || price <= 0) continue;

    const listPrice = item.precioAnterior ? sanitizeListPrice(price, item.precioAnterior) : null;
    const slug = item.slug ?? "";
    const link = slug
      ? `https://www.lacoopeencasa.coop/producto/${slug}`
      : "https://www.lacoopeencasa.coop";

    const imageUrl = item.foto ?? null;

    products.push({ productName: name, price, listPrice, link, imageUrl });
  }

  setCache(cacheKey, products);
  return products;
}

// ============================================
// Public API
// ============================================

/**
 * Public persisted-query hash for VTEX Intelligent Search.
 * Obtained from carrefour.com.ar DevTools. Shared across all VTEX stores.
 * Update this value if VTEX rotates the hash (rare — usually lasts months).
 */
const VTEX_SHA256_HASH = "3eca26a431d4646a8bbce2644b78d3ca734bf8b4ba46afe4269621b64b0fb67d";

/** Search a single store for a product term. */
export async function searchStore(store: StoreConfig, query: string): Promise<VtexProduct[]> {
  try {
    switch (store.type) {
      case "vtex":
        return await searchVtexStore(store, query, VTEX_SHA256_HASH);
      case "vtex-legacy":
        return await searchVtexLegacy(store, query);
      case "coto":
        return await searchCoto(query);
      case "coope":
        return await searchCoopObrera(query);
    }
  } catch {
    return [];
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

/** Search all applicable stores for a product term, in parallel. */
export async function searchAllStores(query: string, city?: string | null): Promise<StoreSearchResult[]> {
  const stores = city !== undefined ? getStoresForCity(city) : SUPERMARKET_STORES;

  const results = await Promise.allSettled(
    stores.map(async (store) => {
      const products = await searchStore(store, query);
      return { storeName: store.name, products, failed: false } satisfies StoreSearchResult;
    }),
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return { storeName: stores[i]!.name, products: [], failed: true };
  });
}
