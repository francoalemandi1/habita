/**
 * URL Recommender — asks DeepSeek for the best URLs to scrape
 * for cultural events in a given city.
 *
 * Replaces Tavily search for the activities section:
 * instead of searching the web and hoping for good results,
 * we ask the LLM which sites are most reliable for each category.
 *
 * Cache: 24h per city (URLs don't change frequently).
 * Cost: ~$0.001 per call (DeepSeek is virtually free).
 */

import { generateObject } from "ai";
import { z } from "zod";
import { getDeepSeekModel } from "./deepseek-provider";
import { ISO_TO_COUNTRY_NAME } from "@/lib/web-search";

// ============================================
// Types
// ============================================

export interface RecommendedUrl {
  url: string;
  category: string;
  siteName: string;
}

interface UrlCacheEntry {
  urls: RecommendedUrl[];
  expiresAt: number;
}

// ============================================
// Constants
// ============================================

const URL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================
// Cache
// ============================================

const urlCache = new Map<string, UrlCacheEntry>();

// ============================================
// Schema
// ============================================

const urlRecommenderSchema = z.object({
  urls: z.array(z.object({
    url: z.string().describe("URL exacta y navegable de una página que liste eventos actuales"),
    category: z.string().describe("cine | teatro | musica | exposiciones | agenda"),
    siteName: z.string().describe("Nombre corto del sitio"),
  })).min(3).max(7),
});

// ============================================
// Main function
// ============================================

/**
 * Ask DeepSeek for the best URLs to scrape cultural events in a city.
 * Returns 3-7 URLs across categories (cine, teatro, musica, exposiciones, agenda).
 */
export async function recommendUrls(
  city: string,
  country: string,
): Promise<RecommendedUrl[]> {
  const cacheKey = `${city.toLowerCase().trim()}:${country.toLowerCase()}`;

  const cached = urlCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`[url-recommender] cache hit for ${city}`);
    return cached.urls;
  }

  const countryName = ISO_TO_COUNTRY_NAME[country.toUpperCase()] ?? country;

  const prompt = `Sos un experto en agenda cultural de ${countryName}. Para la ciudad de ${city}, ${countryName}, listá las mejores URLs para encontrar información actualizada sobre eventos culturales.

Necesito URLs para estas categorías:
1. **Cine** — cartelera con horarios de funciones
2. **Teatro** — obras en cartel con funciones y precios
3. **Música** — recitales, shows en vivo, conciertos
4. **Exposiciones** — museos, ferias, muestras de arte
5. **Agenda cultural** — agenda general de eventos de la ciudad

Reglas ESTRICTAS:
- Devolvé entre 3 y 7 URLs en total (no necesariamente una por categoría)
- Cada URL debe ser una página ESPECÍFICA que liste eventos con fechas y horarios (NO homepages genéricas)
- Priorizá: sitios oficiales de gobierno (.gob.ar), agendas culturales locales, cadenas de cine nacionales
- NO incluyas redes sociales (Instagram, Facebook, Twitter, YouTube)
- NO incluyas blogs turísticos, booking sites, ni agregadores genéricos
- Las URLs deben ser de sitios reales que existan — no inventes URLs
- Si no conocés un buen sitio para alguna categoría en esta ciudad, omitila`;

  try {
    const model = getDeepSeekModel();
    const result = await generateObject({
      model,
      schema: urlRecommenderSchema,
      prompt,
    });

    const urls = result.object.urls;
    console.log(`[url-recommender] ${city}: ${urls.length} URLs recommended`);
    for (const u of urls) {
      console.log(`  [${u.category}] ${u.siteName}: ${u.url}`);
    }

    urlCache.set(cacheKey, { urls, expiresAt: Date.now() + URL_CACHE_TTL_MS });
    return urls;
  } catch (error) {
    console.error(`[url-recommender] Failed for ${city}:`, error);
    return [];
  }
}
