/**
 * Platform configurations for dedicated event scrapers.
 *
 * Each platform defines URL builders that generate listing/search pages
 * for a given city. Generic HTML → markdown conversion handles the rest;
 * DeepSeek's geographic filter discards events from other cities.
 */

// ============================================
// Types
// ============================================

export interface PlatformConfig {
  /** Human-readable platform name (for logging). */
  name: string;
  /** Primary domain (for CrawledPage.domain + dedup with Tavily). */
  domain: string;
  /**
   * Generate listing URLs for the given city.
   * Returns empty array if the platform doesn't cover that city.
   */
  buildUrls: (city: string) => string[];
}

// ============================================
// Helpers
// ============================================

/** Normalize city name: strip accents, lowercase, trim. */
function normalizeForLookup(city: string): string {
  return city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ============================================
// Platform configs
// ============================================

const ticketek: PlatformConfig = {
  name: "Ticketek",
  domain: "ticketek.com.ar",
  buildUrls: () => [
    "https://www.ticketek.com.ar/musica",
    "https://www.ticketek.com.ar/teatro",
    "https://www.ticketek.com.ar/familia",
  ],
};

const passline: PlatformConfig = {
  name: "Passline",
  domain: "passline.com",
  buildUrls: (city: string) => {
    const slug = encodeURIComponent(normalizeForLookup(city));
    return [
      "https://www.passline.com/eventos",
      `https://www.passline.com/buscar?q=${slug}`,
    ];
  },
};

const allaccess: PlatformConfig = {
  name: "AllAccess",
  domain: "allaccess.com.ar",
  buildUrls: () => [
    "https://www.allaccess.com.ar",
  ],
};

const autoentrada: PlatformConfig = {
  name: "Autoentrada",
  domain: "autoentrada.com",
  buildUrls: () => [
    "https://ventas.autoentrada.com/t/teatro",
    "https://ventas.autoentrada.com/t/musica",
    "https://ventas.autoentrada.com/t/danza",
  ],
};

/** Map normalized city names to alternativateatral provincia query params. */
const AT_CITY_PARAMS: Record<string, string> = {
  "buenos aires": "pais=1&provincia=1",
  "caba": "pais=1&provincia=1",
  "capital federal": "pais=1&provincia=1",
  "cordoba": "pais=1&provincia=3",
  "rosario": "pais=1&provincia=10",
  "santa fe": "pais=1&provincia=10",
  "mendoza": "pais=1&provincia=7",
  "tucuman": "pais=1&provincia=17",
  "la plata": "pais=1&provincia=2",
  "mar del plata": "pais=1&provincia=2",
  "salta": "pais=1&provincia=11",
  "neuquen": "pais=1&provincia=8",
  "bahia blanca": "pais=1&provincia=2",
  "san juan": "pais=1&provincia=12",
  "resistencia": "pais=1&provincia=4",
  "corrientes": "pais=1&provincia=5",
  "posadas": "pais=1&provincia=8",
  "san luis": "pais=1&provincia=13",
  "parana": "pais=1&provincia=6",
  "santiago del estero": "pais=1&provincia=14",
  "jujuy": "pais=1&provincia=15",
  "san salvador de jujuy": "pais=1&provincia=15",
  "rio cuarto": "pais=1&provincia=3",
  "villa maria": "pais=1&provincia=3",
  "villa carlos paz": "pais=1&provincia=3",
};

const alternativaTeatral: PlatformConfig = {
  name: "AlternativaTeatral",
  domain: "alternativateatral.com",
  buildUrls: (city: string) => {
    const normalized = normalizeForLookup(city);
    const params = AT_CITY_PARAMS[normalized];
    if (!params) return [];
    return [
      `https://www.alternativateatral.com/cartelera.asp?${params}`,
    ];
  },
};

// ============================================
// Export
// ============================================

export const SCRAPER_PLATFORMS: PlatformConfig[] = [
  ticketek,
  passline,
  allaccess,
  autoentrada,
  alternativaTeatral,
];
