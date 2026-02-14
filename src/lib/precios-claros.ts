/**
 * Precios Claros (SEPA) API Client
 *
 * Public API from Argentina's government price transparency system.
 * Returns structured product prices per store/location.
 *
 * Base URL: https://d3e6htiiul5ek9.cloudfront.net/prod/
 * No auth required.
 *
 * Graceful: returns [] on failure — never blocks the pipeline.
 */

// ============================================
// Types — API responses
// ============================================

/** Raw product from /prod/productos search */
interface RawProduct {
  id: string;
  marca: string;
  nombre: string;
  presentacion: string;
  precioMin: number;
  precioMax: number;
}

/** Raw sucursal from /prod/producto per-store prices */
interface RawSucursal {
  banderaDescripcion: string;
  direccion: string;
  localidad: string;
  lat: string;
  lng: string;
  preciosProducto: {
    precioLista: number;
  };
}

/** Raw response from /prod/productos */
interface ProductosResponse {
  productos: RawProduct[];
  total: number;
}

/** Raw response from /prod/producto */
interface ProductoResponse {
  producto: {
    id: string;
    marca: string;
    nombre: string;
    presentacion: string;
  };
  sucursales: RawSucursal[];
}

// ============================================
// Types — Public API
// ============================================

/** Product variant found by text search */
export interface PCProduct {
  ean: string;
  brand: string;
  name: string;
  presentation: string;
  priceMin: number;
  priceMax: number;
}

/** A single store's price for a specific product */
export interface PCStorePrice {
  ean: string;
  brand: string;
  name: string;
  presentation: string;
  storeBanner: string;
  storeAddress: string;
  storeLocality: string;
  storeLat: number;
  storeLng: number;
  price: number;
}

// ============================================
// Constants
// ============================================

const BASE_URL = "https://d3e6htiiul5ek9.cloudfront.net/prod";
const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const SEARCH_LIMIT = 30;
const PRICES_LIMIT = 50;

// ============================================
// In-memory cache
// ============================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const searchCache = new Map<string, CacheEntry<PCProduct[]>>();
const pricesCache = new Map<string, CacheEntry<PCStorePrice[]>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }
  if (entry) {
    cache.delete(key);
  }
  return null;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ============================================
// Concurrency limiter
// ============================================

/**
 * Run async tasks with a concurrency limit.
 * Returns results in the same order as inputs.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      const item = items[index]!;
      try {
        const value = await fn(item);
        results[index] = { status: "fulfilled", value };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
}

// ============================================
// Core fetch helper
// ============================================

async function fetchPC<T>(path: string, params: Record<string, string | number>): Promise<T | null> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; HabitaApp/1.0)",
      },
    });

    if (!response.ok) {
      console.warn(`[precios-claros] ${path} returned ${response.status}`);
      return null;
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      console.warn(`[precios-claros] ${path} timed out`);
    } else {
      console.warn(`[precios-claros] ${path} failed:`, error);
    }
    return null;
  }
}

// ============================================
// Search term cleanup
// ============================================

/**
 * Strip quantities, units, and numbers from search terms.
 * Precios Claros API returns 0 results when terms include
 * measurements like "1.5 litros", "500g", "1 kilo", etc.
 */
function cleanSearchTerm(term: string): string {
  return term
    .replace(/\d+([.,]\d+)?\s*/g, "") // numbers (with optional decimals)
    .replace(/\b(ml|lt|lts|litros?|litro|cc|kg|kgs?|kilos?|gr|grs?|gramos?|un|und|unidades?|rollos?|saquitos?|sachet)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ============================================
// Public API
// ============================================

/**
 * Search products by text near a location.
 * Returns product variants with precioMin/precioMax.
 */
export async function searchProducts(
  term: string,
  latitude: number,
  longitude: number,
): Promise<PCProduct[]> {
  const cleanedTerm = cleanSearchTerm(term);
  const locationKey = `${latitude.toFixed(1)}:${longitude.toFixed(1)}`;
  const cacheKey = `search:${cleanedTerm}:${locationKey}`;

  const cached = getCached(searchCache, cacheKey);
  if (cached) return cached;

  const data = await fetchPC<ProductosResponse>("/productos", {
    string: cleanedTerm,
    lat: latitude,
    lng: longitude,
    limit: SEARCH_LIMIT,
  });

  if (!data?.productos) return [];

  const products: PCProduct[] = data.productos.map((p) => ({
    ean: p.id,
    brand: p.marca,
    name: p.nombre,
    presentation: p.presentacion,
    priceMin: p.precioMin,
    priceMax: p.precioMax,
  }));

  setCache(searchCache, cacheKey, products);
  return products;
}

/**
 * Get per-store prices for a specific product (by EAN).
 * Returns prices sorted by lowest first.
 */
export async function getProductPrices(
  ean: string,
  latitude: number,
  longitude: number,
): Promise<PCStorePrice[]> {
  const locationKey = `${latitude.toFixed(1)}:${longitude.toFixed(1)}`;
  const cacheKey = `prices:${ean}:${locationKey}`;

  const cached = getCached(pricesCache, cacheKey);
  if (cached) return cached;

  const data = await fetchPC<ProductoResponse>("/producto", {
    id_producto: ean,
    lat: latitude,
    lng: longitude,
    limit: PRICES_LIMIT,
  });

  if (!data?.sucursales) return [];

  const prices: PCStorePrice[] = data.sucursales
    .filter((s) => s.preciosProducto?.precioLista > 0)
    .map((s) => ({
      ean: data.producto.id,
      brand: data.producto.marca,
      name: data.producto.nombre,
      presentation: data.producto.presentacion,
      storeBanner: s.banderaDescripcion,
      storeAddress: s.direccion,
      storeLocality: s.localidad,
      storeLat: parseFloat(s.lat),
      storeLng: parseFloat(s.lng),
      price: s.preciosProducto.precioLista,
    }));

  // Sort by price ascending
  prices.sort((a, b) => a.price - b.price);

  setCache(pricesCache, cacheKey, prices);
  return prices;
}
