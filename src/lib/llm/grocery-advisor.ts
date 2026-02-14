/**
 * Grocery Advisor Pipeline
 *
 * Catalog-driven price extraction and store clustering for household products.
 *
 * Architecture:
 *   1. Load products from ProductCatalog (DB) for the requested category
 *   2. Build targeted Tavily queries per product group (~3 products per query)
 *   3. LLM extracts prices for KNOWN products only (constrained checklist)
 *   4. Post-process: normalize prices, validate, fix inversions
 *   5. Cluster by store (normalized names)
 *   6. Score stores deterministically and generate recommendation
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAIEnabled, getAIProviderType } from "./provider";
import { searchWithTavily } from "@/lib/tavily";
import { searchWithSerper } from "@/lib/serper";
import { buildLocationString, extractDomain } from "@/lib/web-search";
import { normalizeStoreName, isExcludedSource, buildProductSearchUrl } from "./store-normalizer";
import { matchBasket } from "./core/scoring/basket-matcher";
import { scoreStores } from "./core/scoring/store-scorer";
import { buildStoreRecommendation } from "./core/recommendation/build-recommendation";

import type { LanguageModel } from "ai";
import type { GroceryCategory } from "@prisma/client";
import type { WebSearchResult } from "@/lib/web-search";
import type { StoreScore } from "./core/scoring/store-scorer";
import type { StoreRecommendation } from "./core/recommendation/build-recommendation";

// ============================================
// Types
// ============================================

export type GroceryTab =
  | "almacen"
  | "panaderia_dulces"
  | "lacteos"
  | "carnes"
  | "frutas_verduras"
  | "bebidas"
  | "limpieza"
  | "perfumeria";

export type { StoreScore, StoreRecommendation };

export interface ProductPrice {
  productName: string;
  store: string;
  price: string;
  originalPrice: string | null;
  discount: string;
  savingsPercent: number | null;
  sourceUrl: string;
  source: string;
}

export interface StoreCluster {
  storeName: string;
  productCount: number;
  products: ProductPrice[];
  totalEstimatedSavings: number;
  averageDiscountPercent: number;
  score: number;
}

export interface GroceryAdvisorResult {
  clusters: StoreCluster[];
  recommendation: string;
  productsNotFound: string[];
  generatedAt: string;
  /** Deterministic store scores based on basket coverage */
  storeScores: StoreScore[];
  /** Structured recommendation with confidence level */
  storeRecommendation: StoreRecommendation;
}

export interface GroceryAdvisorOptions {
  category: GroceryTab;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

// ============================================
// Constants
// ============================================

const TAB_TO_ENUM: Record<GroceryTab, GroceryCategory> = {
  almacen: "ALMACEN",
  panaderia_dulces: "PANADERIA_DULCES",
  lacteos: "LACTEOS",
  carnes: "CARNES",
  frutas_verduras: "FRUTAS_VERDURAS",
  bebidas: "BEBIDAS",
  limpieza: "LIMPIEZA",
  perfumeria: "PERFUMERIA",
};

const MAX_QUERIES_PER_CATEGORY = 8;
const PRODUCTS_PER_QUERY = 2;
const CURRENT_YEAR = new Date().getFullYear();

/** Keywords that indicate wholesale/bulk-only offers */
const WHOLESALE_KEYWORDS = [
  "mayorista", "por bulto", "unidad de presentación",
  "pack cerrado", "caja cerrada", "mínimo 10", "mínimo 5",
  "por pallet", "reventa",
];

/** Generic discount descriptions that don't add value */
const VAGUE_DISCOUNTS = ["oferta", "promoción", "promocion", "promo", "descuento"];

/** Price must be at least this amount (ARS) to be considered valid */
const MIN_VALID_PRICE_ARS = 50;

/** Price above this is almost certainly a parsing error (no catalog product costs this much) */
const MAX_VALID_PRICE_ARS = 15_000;

/** Discount percentage above this threshold is almost certainly an LLM error */
const MAX_VALID_DISCOUNT_PERCENT = 70;

/** Discounts below this threshold are too small to be useful — hide them */
const MIN_MEANINGFUL_DISCOUNT_PERCENT = 5;

/** Spanish month names for date-without-year detection */
const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// ============================================
// Raw LLM types
// ============================================

interface RawLLMProduct {
  catalogProduct: string;
  store: string;
  currentPrice: string;
  regularPrice: string | null;
  discountLabel: string | null;
  sourceIndex: number;
}

interface RawLLMResult {
  products: RawLLMProduct[];
}

// ============================================
// Main function
// ============================================

/**
 * Generate grocery deals for a category and location.
 * Returns store clusters with scored recommendations.
 */
export async function generateGroceryDeals(
  options: GroceryAdvisorOptions
): Promise<GroceryAdvisorResult | null> {
  if (!isAIEnabled()) return null;

  const categoryEnum = TAB_TO_ENUM[options.category];

  // Stage 1: Load catalog products
  const catalogProducts = await prisma.productCatalog.findMany({
    where: { category: categoryEnum, isActive: true },
    orderBy: { name: "asc" },
  });

  if (catalogProducts.length === 0) {
    console.warn(`[grocery-advisor] No catalog products for category ${categoryEnum}`);
    return null;
  }

  const productNames = catalogProducts.map((p) => p.name);

  // Stage 2: Build targeted queries
  const location = buildLocationString(options.city, options.country);
  const queries = buildTargetedQueries(catalogProducts, location);
  const cacheKey = `grocery:${options.category}:${options.city.toLowerCase()}`;

  // Stage 3: Web search (Tavily primary, Serper fallback)
  let webResults = await searchWithTavily(queries, cacheKey);

  if (webResults.length === 0 && process.env.SERPER_API_KEY) {
    console.warn("[grocery-advisor] Tavily returned no results, falling back to Serper");
    webResults = await searchWithSerper(queries, cacheKey);
  }

  if (webResults.length === 0) {
    console.error(`[grocery-advisor] No web results for ${options.city} (category: ${options.category})`);
    return null;
  }

  // Stage 4: LLM extracts prices for known products
  const webContentBlock = buildWebContentBlock(webResults);
  const prompt = buildPrompt(productNames, location, options.country, webContentBlock);

  let raw: RawLLMResult | null = null;

  const providerType = getAIProviderType();
  if (providerType === "openrouter") {
    raw = await callOpenRouter(prompt, productNames, webResults.length);
  } else {
    const model = getModel();
    if (!model) return null;

    const schema = buildSchema(productNames, webResults.length);
    try {
      const generated = await generateObject({ model, schema, prompt });
      raw = generated.object;
    } catch (error) {
      console.error("[grocery-advisor] AI error:", error);
      return null;
    }
  }

  if (!raw || raw.products.length === 0) {
    console.warn("[grocery-advisor] LLM returned no products");
    return null;
  }

  console.log(`[grocery-advisor] [${options.category}] LLM raw: ${raw.products.length} prices, web sources: ${webResults.length}, queries: ${queries.length}`);

  // Stage 5: Post-process
  const processedPrices = postProcess(raw.products, webResults, productNames);

  console.log(`[grocery-advisor] [${options.category}] After postProcess: ${processedPrices.length}/${raw.products.length} prices survived filtering`);

  // Stage 6: Cluster by store
  const clusters = clusterByStore(processedPrices);

  // Stage 7: Legacy score and sort (for cluster ordering)
  const scoredClusters = scoreAndSort(clusters);

  // Stage 8: Basket matching + store scoring + recommendation
  const basketResults = matchBasket(scoredClusters);
  const storeScores = scoreStores(basketResults);
  const storeRecommendation = buildStoreRecommendation(storeScores, scoredClusters);

  // Re-sort clusters by basket-aware store score when available
  const storeScoreMap = new Map(storeScores.map((s) => [s.storeName, s.finalScore]));
  const finalClusters = scoredClusters.sort((a, b) => {
    const scoreA = storeScoreMap.get(a.storeName) ?? 0;
    const scoreB = storeScoreMap.get(b.storeName) ?? 0;
    return scoreB - scoreA;
  });

  // Legacy recommendation string (backward compatible)
  const recommendation = storeRecommendation.text;

  // Identify products not found
  const foundProductNames = new Set(processedPrices.map((p) => p.productName));
  const productsNotFound = productNames.filter((name) => !foundProductNames.has(name));

  if (productsNotFound.length > 0) {
    console.log(`[grocery-advisor] [${options.category}] Not found (${productsNotFound.length}/${productNames.length}): ${productsNotFound.join(", ")}`);
  }

  return {
    clusters: finalClusters,
    recommendation,
    productsNotFound,
    generatedAt: new Date().toISOString(),
    storeScores,
    storeRecommendation,
  };
}

// ============================================
// Stage 2: Query builder
// ============================================

function buildTargetedQueries(
  products: Array<{ name: string; searchTerms: string }>,
  location: string
): string[] {
  const queries: string[] = [];

  // Product-focused queries (2 products each)
  for (let i = 0; i < products.length && queries.length < MAX_QUERIES_PER_CATEGORY; i += PRODUCTS_PER_QUERY) {
    const batch = products.slice(i, i + PRODUCTS_PER_QUERY);
    const productTerms = batch
      .map((p) => p.searchTerms || p.name)
      .join(", ");
    queries.push(`precio ${productTerms} supermercado ${location} ${CURRENT_YEAR}`);
  }

  return queries;
}

// ============================================
// Web content block
// ============================================

const RAW_CONTENT_MAX_LENGTH = 5000;

function buildWebContentBlock(results: WebSearchResult[]): string {
  const blocks = results.map((r, i) => {
    const content = r.rawContent
      ? truncateContent(r.rawContent, RAW_CONTENT_MAX_LENGTH)
      : r.snippet;
    return `### [${i}] ${r.title} (${r.source})\n${content}`;
  });
  return `## Fuentes web\n\n${blocks.join("\n\n")}`;
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return `${content.slice(0, maxLength)}...[contenido truncado]`;
}

// ============================================
// Schema
// ============================================

function buildSchema(productNames: string[], webResultCount: number) {
  const productSchema = z.object({
    catalogProduct: z.string()
      .describe("Nombre EXACTO del producto tal como aparece en la lista de PRODUCTOS A BUSCAR. Copiar textualmente."),
    store: z.string().min(1)
      .describe("Nombre del comercio donde se encontró el precio (ej: 'Carrefour', 'Coto')"),
    currentPrice: z.string()
      .describe("Precio actual visible en la fuente. Formato: '$X.XXX' o '$X.XXX,XX'"),
    regularPrice: z.string().nullable()
      .describe("Precio regular/anterior si hay descuento. Null si no hay precio de referencia. Siempre mayor que currentPrice."),
    discountLabel: z.string().nullable()
      .describe("Descuento concreto si existe (ej: '30% off', '2x1'). Null si no hay descuento explícito."),
    sourceIndex: z.number().int().min(0).max(Math.max(webResultCount - 1, 0))
      .describe("Índice de la fuente web [0..N]"),
  });

  return z.object({
    products: z.array(productSchema).max(productNames.length * 3),
  });
}

// ============================================
// Prompt
// ============================================

function buildPrompt(
  productNames: string[],
  location: string,
  country: string,
  webContentBlock: string
): string {
  const productList = productNames
    .map((name, i) => `${i + 1}. ${name}`)
    .join("\n");

  return `
Eres un extractor de precios de productos de supermercado en ${country}.

PRODUCTOS A BUSCAR:
${productList}

INSTRUCCIONES:
Para cada producto de la lista anterior, buscá en las fuentes web su precio actual.
- Los nombres de la lista son genéricos (ej: "Aceite girasol"). Matcheá con cualquier variante del producto en las fuentes (ej: "Aceite girasol Natura 1.5L", "Aceite de girasol Cocinero 900ml").
- Si un producto aparece en MÚLTIPLES tiendas, incluí TODAS las apariciones.
- Si un producto NO aparece en ninguna fuente, NO lo incluyas.
- NUNCA inventes productos que no están en la lista.
- NUNCA inventes precios. Solo precios explícitamente visibles en las fuentes.

REGLAS DE PRECIOS:
- currentPrice = precio final que paga el cliente (el MENOR).
- regularPrice = precio de lista sin descuento (el MAYOR). Null si no hay referencia.
- Si regularPrice < currentPrice, están invertidos: corregí el orden.
- El precio debe ser por unidad del producto listado, NO por kg/litro suelto.
- Ignorar precios mayoristas o por bulto.

FORMATO:
- catalogProduct: copiar TEXTUALMENTE el nombre de la lista de arriba (ej: "Aceite girasol", NO "Aceite girasol Natura 1.5L").
- store: nombre del comercio.
- currentPrice: "$X.XXX" o "$X.XXX,XX".
- regularPrice: "$X.XXX" o null.
- discountLabel: "30% off", "2x1", etc. o null.
- sourceIndex: índice de la fuente [0..N].

Estoy buscando precios en ${location}.

${webContentBlock}

Responder únicamente en JSON válido según el schema.
`;
}

// ============================================
// Model selection
// ============================================

function getModel(): LanguageModel | null {
  const providerType = getAIProviderType();

  if (providerType === "openrouter") return null;

  if (providerType === "gemini") {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return google("gemini-1.5-flash");
  }

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  return anthropic("claude-3-5-haiku-latest");
}

// ============================================
// OpenRouter
// ============================================

async function callOpenRouter(
  prompt: string,
  productNames: string[],
  webResultCount: number
): Promise<RawLLMResult | null> {
  const { OpenRouter } = await import("@openrouter/sdk");
  const client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

  const systemRules = `
Eres un extractor de precios de productos de supermercado.
Responde SOLO con JSON válido.

REGLAS:
- Solo extraer precios de productos que están en la lista proporcionada.
- Los nombres en la lista son genéricos (ej: "Aceite girasol"). Matcheá con cualquier variante del producto en las fuentes (ej: "Aceite girasol Natura 1.5L").
- catalogProduct debe ser una copia TEXTUAL del nombre genérico en la lista, NO el nombre específico de la fuente.
- Solo precios explícitos visibles en las fuentes. No inferir.
- currentPrice es el precio final (menor). regularPrice es el precio de lista (mayor).
- Si regularPrice < currentPrice, están invertidos.
- Ignorar precios mayoristas o por bulto.
- Si un producto aparece en múltiples tiendas, incluir todas.
- sourceIndex entre 0 y ${webResultCount - 1}.

Formato:
{
  "products": [
    {
      "catalogProduct": "string",
      "store": "string",
      "currentPrice": "string",
      "regularPrice": "string | null",
      "discountLabel": "string | null",
      "sourceIndex": number
    }
  ]
}
`;

  try {
    const result = await client.chat.send({
      chatGenerationParams: {
        model: "openrouter/auto",
        messages: [
          { role: "system", content: systemRules },
          { role: "user", content: prompt },
        ],
        stream: false,
      },
    });

    const message = result.choices?.[0]?.message;
    const text = typeof message?.content === "string" ? message.content : "{}";
    return parseJSON(text, productNames);
  } catch (error) {
    console.error("[grocery-advisor] OpenRouter error:", error);
    return null;
  }
}

function parseJSON(text: string, _productNames: string[]): RawLLMResult | null {
  try {
    return JSON.parse(text) as RawLLMResult;
  } catch {
    // Try extracting JSON block
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as RawLLMResult;
      } catch {
        // Try repairing truncated JSON
        try {
          const repaired = repairTruncatedJSON(jsonMatch[0]);
          return JSON.parse(repaired) as RawLLMResult;
        } catch {
          // noop
        }
      }
    }
  }

  console.error("[grocery-advisor] Failed to parse OpenRouter JSON");
  return null;
}

function repairTruncatedJSON(json: string): string {
  let repaired = json.replace(/,\s*\{[^}]*$/, "");
  const openBraces = (repaired.match(/\{/g) ?? []).length;
  const closeBraces = (repaired.match(/\}/g) ?? []).length;
  const openBrackets = (repaired.match(/\[/g) ?? []).length;
  const closeBrackets = (repaired.match(/\]/g) ?? []).length;
  repaired += "]".repeat(Math.max(0, openBrackets - closeBrackets));
  repaired += "}".repeat(Math.max(0, openBraces - closeBraces));
  return repaired;
}

// ============================================
// Post-processing
// ============================================

function postProcess(
  rawProducts: RawLLMProduct[],
  webResults: WebSearchResult[],
  catalogNames: string[]
): ProductPrice[] {
  const catalogSet = new Set(catalogNames);

  return rawProducts
    .filter((p) => p.catalogProduct && p.store && p.currentPrice)
    // Only accept products that match our catalog
    .filter((p) => catalogSet.has(p.catalogProduct))
    // Filter wholesale and non-grocery sources
    .filter((p) => !isWholesaleOffer(p.store))
    .filter((p) => !isExcludedSource(p.store))
    .map((p) => {
      const sourceIndex = p.sourceIndex;
      const webSource = sourceIndex >= 0 && sourceIndex < webResults.length
        ? webResults[sourceIndex]
        : null;

      // Parse and normalize prices
      let currentNum = parsePrice(p.currentPrice);
      let regularNum = p.regularPrice ? parsePrice(p.regularPrice) : null;

      // Fix inverted prices
      if (currentNum !== null && regularNum !== null && currentNum > regularNum) {
        const temp = currentNum;
        currentNum = regularNum;
        regularNum = temp;
      }

      const finalPrice = currentNum !== null ? formatPriceARS(currentNum) : p.currentPrice;
      const finalOriginalPrice = regularNum !== null ? formatPriceARS(regularNum) : null;

      // Calculate savings
      const savingsPercent =
        currentNum !== null && regularNum !== null && regularNum > currentNum
          ? calculateSavingsPercent(currentNum, regularNum)
          : null;

      // Clean discount label
      let discountLabel = p.discountLabel ?? "";
      if (isVagueDiscount(discountLabel) && savingsPercent !== null && savingsPercent > 0) {
        discountLabel = `${savingsPercent}% off`;
      } else if (isVagueDiscount(discountLabel) && finalOriginalPrice) {
        discountLabel = "Precio promocional";
      } else if (isVagueDiscount(discountLabel)) {
        discountLabel = "";
      }

      const normalizedStore = normalizeStoreName(p.store);

      return {
        productName: p.catalogProduct,
        store: normalizedStore,
        price: finalPrice,
        originalPrice: finalOriginalPrice,
        discount: discountLabel,
        savingsPercent,
        sourceUrl: buildProductSearchUrl(normalizedStore, p.catalogProduct),
        source: webSource ? extractDomain(webSource.url) : normalizedStore,
        _currentNum: currentNum,
      };
    })
    // Filter absurd prices (LLM hallucinations)
    .filter((p) => {
      if (p._currentNum !== null && p._currentNum < MIN_VALID_PRICE_ARS) return false;
      if (p._currentNum !== null && p._currentNum > MAX_VALID_PRICE_ARS) return false;
      if (p.savingsPercent !== null && p.savingsPercent > MAX_VALID_DISCOUNT_PERCENT) return false;
      return true;
    })
    // Suppress insignificant discounts (keep product, just hide the savings info)
    .map((p) => {
      if (p.savingsPercent !== null && p.savingsPercent < MIN_MEANINGFUL_DISCOUNT_PERCENT) {
        return { ...p, savingsPercent: null, discount: "", originalPrice: null };
      }
      return p;
    })
    // Strip internal field
    .map(({ _currentNum, ...rest }) => rest);
}

// ============================================
// Price helpers (reused from deals-finder pattern)
// ============================================

function parsePrice(priceStr: string): number | null {
  const cleaned = priceStr.replace(/[$ \t]/g, "");
  // Argentine format: "4.970,00" → dots as thousands, comma as decimal
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  const parsed = parseFloat(cleaned.replace(/,/g, ""));
  return isNaN(parsed) ? null : parsed;
}

function formatPriceARS(amount: number): string {
  const formatted = Math.round(amount).toLocaleString("es-AR");
  return `$${formatted}`;
}

function calculateSavingsPercent(discounted: number, regular: number): number {
  if (regular <= 0) return 0;
  return Math.round(((regular - discounted) / regular) * 100);
}

function isWholesaleOffer(storeName: string): boolean {
  const lower = storeName.toLowerCase();
  return WHOLESALE_KEYWORDS.some((kw) => lower.includes(kw));
}

function isVagueDiscount(description: string | null | undefined): boolean {
  if (!description) return true;
  return VAGUE_DISCOUNTS.includes(description.trim().toLowerCase());
}

// ============================================
// Stage 6: Cluster by store
// ============================================

function clusterByStore(prices: ProductPrice[]): StoreCluster[] {
  const storeMap = new Map<string, ProductPrice[]>();

  for (const price of prices) {
    const existing = storeMap.get(price.store) ?? [];
    // Deduplicate: keep first occurrence of each product per store
    if (!existing.some((p) => p.productName === price.productName)) {
      existing.push(price);
      storeMap.set(price.store, existing);
    }
  }

  return Array.from(storeMap.entries()).map(([storeName, products]) => {
    const totalSavings = products.reduce((sum, p) => {
      if (p.savingsPercent === null || p.savingsPercent <= 0) return sum;
      const currentNum = parsePrice(p.price);
      const originalNum = p.originalPrice ? parsePrice(p.originalPrice) : null;
      if (currentNum !== null && originalNum !== null) {
        return sum + (originalNum - currentNum);
      }
      return sum;
    }, 0);

    const discountedProducts = products.filter((p) => p.savingsPercent !== null && p.savingsPercent > 0);
    const avgDiscount = discountedProducts.length > 0
      ? Math.round(discountedProducts.reduce((s, p) => s + (p.savingsPercent ?? 0), 0) / discountedProducts.length)
      : 0;

    return {
      storeName,
      productCount: products.length,
      products,
      totalEstimatedSavings: Math.round(totalSavings),
      averageDiscountPercent: avgDiscount,
      score: 0, // Calculated in next stage
    };
  });
}

// ============================================
// Stage 7: Scoring + recommendation
// ============================================

function scoreAndSort(clusters: StoreCluster[]): StoreCluster[] {
  return clusters
    .map((cluster) => ({
      ...cluster,
      score: cluster.productCount * 3 + cluster.totalEstimatedSavings * 0.01 + cluster.averageDiscountPercent * 0.5,
    }))
    .sort((a, b) => b.score - a.score);
}

function buildRecommendation(clusters: StoreCluster[]): string {
  if (clusters.length === 0) {
    return "No se encontraron precios para esta categoría.";
  }

  const best = clusters[0]!;

  if (clusters.length === 1) {
    const savingsPart = best.totalEstimatedSavings > 0
      ? ` con ahorro estimado de ${formatPriceARS(best.totalEstimatedSavings)}`
      : "";
    return `Encontramos ${best.productCount} productos en ${best.storeName}${savingsPart}.`;
  }

  const savingsPart = best.totalEstimatedSavings > 0
    ? `, ahorrás ~${formatPriceARS(best.totalEstimatedSavings)}`
    : "";
  const secondBest = clusters[1]!;
  return `Mejor opción: ${best.storeName} (${best.productCount} productos${savingsPart}). También revisá ${secondBest.storeName}.`;
}
