/**
 * Store Name Normalizer
 *
 * Normalizes store names from web search results into canonical names
 * for consistent clustering. E.g. "Carrefour Express Av. Colón" → "Carrefour"
 */

// ============================================
// Store aliases → canonical name
// ============================================

const STORE_ALIASES: [string[], string][] = [
  [["carrefour express", "carrefour market", "carrefour maxi", "carrefour hiper", "carrefour.com"], "Carrefour"],
  [["coto digital", "cotodigital", "coto.com"], "Coto"],
  [["jumbo", "jumbo.com"], "Jumbo"],
  [["disco", "disco.com"], "Disco"],
  [["vea", "vea digital", "vea.com"], "Vea"],
  [["changomas", "chango más", "changomás"], "Changomás"],
  [["walmart", "walmart argentina"], "Changomás"],
  [["día", "dia", "dia%", "supermercados dia", "diaonline"], "Día"],
  [["la anónima", "la anonima"], "La Anónima"],
  [["farmacity"], "Farmacity"],
  [["farmaonline"], "Farmaonline"],
  [["farmacia del pueblo"], "Farmacia del Pueblo"],
  [["pedidosya", "pedidos ya"], "PedidosYa"],
  [["rappi"], "Rappi"],
  [["mercado libre", "mercadolibre"], "Mercado Libre"],
  [["maxiconsumo"], "Maxiconsumo"],
  [["super mami", "supermami"], "Super Mami"],
  [["cordiez"], "Cordiez"],
  [["libertad"], "Libertad"],
  [["diarco"], "Diarco"],
  [["vital"], "Vital"],
  [["becerra"], "Becerra"],
  [["makro"], "Makro"],
];

// ============================================
// Excluded sources (not real supermarkets)
// ============================================

/**
 * Sources that should be excluded from results.
 * These are marketplaces, social networks, or non-grocery sites
 * that produce unreliable price data.
 */
const EXCLUDED_SOURCES: string[] = [
  "facebook",
  "instagram",
  "twitter",
  "tiktok",
  "youtube",
  "mercado libre",
  "mercadolibre",
  "amazon",
  "ebay",
  "aliexpress",
  "olx",
  "blog",
  "wikipedia",
  "reddit",
];

// ============================================
// Main functions
// ============================================

/**
 * Normalize a store name to its canonical form.
 * If no alias matches, returns the original name trimmed.
 */
export function normalizeStoreName(rawName: string): string {
  const lower = rawName.trim().toLowerCase();

  for (const [aliases, canonical] of STORE_ALIASES) {
    if (aliases.some((alias) => lower.includes(alias))) {
      return canonical;
    }
  }

  // No match — capitalize first letter of each word
  return rawName.trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Check if a store name belongs to a non-grocery source
 * that should be excluded from results.
 */
export function isExcludedSource(storeName: string): boolean {
  const lower = storeName.trim().toLowerCase();
  return EXCLUDED_SOURCES.some((src) => lower.includes(src));
}

// ============================================
// Store search URLs
// ============================================

/**
 * Search URL patterns for known stores.
 * `{q}` is replaced with the URL-encoded product name.
 */
const STORE_SEARCH_URLS: Record<string, string> = {
  "Carrefour": "https://www.carrefour.com.ar/search?q={q}",
  "Coto": "https://www.cotodigital3.com.ar/sitios/cdigi/browse?_dyncharset=utf-8&Dy=1&Ntt={q}",
  "Jumbo": "https://www.jumbo.com.ar/search?q={q}",
  "Disco": "https://www.disco.com.ar/search?q={q}",
  "Vea": "https://www.vea.com.ar/search?q={q}",
  "Changomás": "https://www.changomas.com.ar/search?q={q}",
  "Día": "https://diaonline.supermercadosdia.com.ar/search?q={q}",
  "Farmacity": "https://www.farmacity.com/search?q={q}",
  "Maxiconsumo": "https://www.maxiconsumo.com/search/{q}",
  "Super Mami": "https://www.supermami.com.ar/search?q={q}",
  "Makro": "https://www.makro.com.ar/search?q={q}",
  "La Anónima": "https://supermercado.laanonimaonline.com/buscar?q={q}",
  "Diarco": "https://www.diarco.com.ar/search?q={q}",
  "Libertad": "https://www.hiperlibertad.com.ar/search?q={q}",
  "Cordiez": "https://www.cordiez.com.ar/search?q={q}",
};

/**
 * Build a direct search URL for a product in a known store.
 * Falls back to a Google `site:` search for unknown stores.
 */
export function buildProductSearchUrl(storeName: string, productName: string): string {
  const encoded = encodeURIComponent(productName);
  const template = STORE_SEARCH_URLS[storeName];
  if (template) {
    return template.replace("{q}", encoded);
  }
  return `https://www.google.com/search?q=${encoded}+${encodeURIComponent(storeName)}+precio`;
}
