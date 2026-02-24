import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { isAIEnabled, getAIProviderType } from "./provider";
import { getDeepSeekModel } from "./deepseek-provider";
import { buildRegionalContext } from "./regional-context";
import { searchWithTavily } from "@/lib/tavily";
import { searchWithSerper } from "@/lib/serper";
import { buildLocationString, extractDomain } from "@/lib/web-search";
import { classifyHabita, diversifyByCategory } from "./habita-classifier";

import type { LanguageModel } from "ai";
import type { WebSearchResult } from "@/lib/web-search";
import type { HabitaCategory } from "./habita-classifier";

// ============================================
// Types
// ============================================

export interface DealResult {
  title: string;
  store: string;
  price: string;
  originalPrice: string | null;
  discount: string;
  /** Calculated savings percentage (e.g. 17) when both prices are available */
  savingsPercent: number | null;
  validUntil: string;
  sourceUrl: string;
  source: string;
  tip: string;
  /** Approximate distance in km from user, null if store has no address */
  distanceKm: number | null;
  /** Habita domain category (comida, bebidas, limpieza, etc.) */
  category: HabitaCategory;
}

export interface DealsResult {
  deals: DealResult[];
  summary: string;
}

export interface DealFinderOptions {
  searchTerm: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/** Raw LLM output before post-processing */
interface RawLLMDeal {
  productName: string;
  store: string;
  storeAddress: string | null;
  discountedPrice: string;
  regularPrice: string | null;
  discountDescription: string | null;
  validUntil: string;
  sourceIndex: number;
  detail: string;
}

interface RawLLMDealsResult {
  deals: RawLLMDeal[];
  summary: string;
}

// ============================================
// Constants
// ============================================

const CURRENT_YEAR = new Date().getFullYear();

/** Keywords that indicate wholesale/bulk-only offers — not useful for end consumers */
const WHOLESALE_KEYWORDS = [
  "mayorista", "por bulto", "unidad de presentación",
  "pack cerrado", "caja cerrada", "mínimo 10", "mínimo 5",
  "por pallet", "reventa",
];

/** Years considered too old for offers to be relevant */
const MIN_VALID_YEAR = CURRENT_YEAR - 1;

/** Generic discount descriptions that don't add value — filtered in post-processing */
const VAGUE_DISCOUNTS = ["oferta", "promoción", "promocion", "promo", "descuento"];

/** Spanish month names for date-without-year detection */
const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// ============================================
// Query builder
// ============================================

/** Search terms that are store/category names — treat as broad searches with context */
const BROAD_SEARCH_TERMS = [
  "supermercado", "farmacia", "carnicería", "carniceria", "verdulería", "verduleria",
  "kiosco", "almacén", "almacen", "dietética", "dietetica", "perfumería", "perfumeria",
];

function isBroadSearchTerm(searchTerm: string): boolean {
  return BROAD_SEARCH_TERMS.includes(searchTerm.trim().toLowerCase());
}

function buildDealQueries(searchTerm: string, location: string): string[] {
  const term = searchTerm.trim();

  if (term && !isBroadSearchTerm(term)) {
    // Specific product search (e.g. "leche", "pañales")
    return [
      `ofertas ${term} ${location} precio promoción`,
      `${term} descuento ${location} supermercado`,
    ];
  }

  // Broad search: no term or store/category name
  const storeContext = term ? `${term} ` : "";
  return [
    `ofertas ${storeContext}${location} hoy productos precio promoción`,
    `descuentos ${storeContext}${location} supermercado comercio`,
  ];
}

function buildCacheKey(searchTerm: string, city: string): string {
  const term = searchTerm.trim().toLowerCase() || "general";
  return `deals:${term}:${city.toLowerCase().trim()}`;
}

// ============================================
// Schema factory
// ============================================

function buildSchema(webResultCount: number) {
  const dealSchema = z.object({
    productName: z.string().min(1)
      .describe("Nombre EXACTO del producto específico (ej: 'Coca Cola 2.25L', 'Leche La Serenísima 1L'). NUNCA genérico como 'Alimentos' o 'Bebidas'."),
    store: z.string().min(1)
      .describe("Nombre del comercio (ej: 'Carrefour', 'Coto', 'Farmacity')"),
    storeAddress: z.string().nullable()
      .describe("Dirección o sucursal del comercio si se menciona en la fuente (ej: 'Av. Corrientes 1234'). Null si no hay."),
    discountedPrice: z.string()
      .describe("Precio CON descuento ya aplicado, el precio MENOR que paga el cliente (ej: '$3.500'). Este es el precio final."),
    regularPrice: z.string().nullable()
      .describe("Precio SIN descuento, el precio MAYOR original de lista (ej: '$4.900'). Null si no se conoce. Siempre mayor que discountedPrice."),
    discountDescription: z.string()
      .describe("Descuento CONCRETO (ej: '30% off', '2x1', '2do al 70%'). NUNCA poner solo 'Oferta' o 'Promoción'."),
    validUntil: z.string()
      .describe(`Vigencia con año explícito ${CURRENT_YEAR}. Si la fecha no tiene año, poner 'Vigencia no confirmada'. NUNCA copiar fechas sin año.`),
    sourceIndex: z.number().int().min(0).max(Math.max(webResultCount - 1, 0))
      .describe("Índice de la fuente web [0..N] de donde se extrajo"),
    detail: z.string()
      .describe("Detalle adicional util: presentación, cantidad, precio por litro/kg, condición del descuento"),
  });

  return z.object({
    deals: z.array(dealSchema).max(10),
    summary: z.string().max(80).describe("Resumen de máximo 20 palabras mencionando al menos un producto concreto y un comercio"),
  });
}

// ============================================
// Model selection
// ============================================

function getModel(): LanguageModel {
  const providerType = getAIProviderType();

  if (providerType === "gemini") {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return google("gemini-1.5-flash");
  }

  return getDeepSeekModel();
}

// ============================================
// Main function
// ============================================

/**
 * Find deals for a search term and location.
 * Architecture:
 * 1. Fetch web content via Tavily (advanced search + rawContent)
 * 2. LLM extracts up to 10 concrete deals from the web content
 * 3. Post-processing classifies, filters, and diversifies results
 * The LLM can ONLY extract — it cannot invent data not present in sources.
 */
export async function findDeals(
  options: DealFinderOptions
): Promise<DealsResult | null> {
  if (!isAIEnabled()) {
    return null;
  }

  const location = buildLocationString(options.city, options.country);
  const queries = buildDealQueries(options.searchTerm, location);
  const cacheKey = buildCacheKey(options.searchTerm, options.city);

  // Step 1: Fetch web results (Tavily primary, Serper fallback)
  let webResults = await searchWithTavily(queries, cacheKey);

  if (webResults.length === 0 && process.env.SERPER_API_KEY) {
    console.warn("[deals-finder] Tavily returned no results, falling back to Serper");
    webResults = await searchWithSerper(queries, cacheKey);
  }

  if (webResults.length === 0) {
    console.error(`[deals-finder] No web results for ${options.city} (term: "${options.searchTerm}")`);
    return null;
  }

  // Step 2: Build context
  const regionalContext = await buildRegionalContext({
    latitude: options.latitude,
    longitude: options.longitude,
    timezone: options.timezone,
    country: options.country,
    city: options.city,
  });

  // Step 3: Build prompt with full web content
  const webContentBlock = buildWebContentBlock(webResults);
  const prompt = buildPrompt(options, regionalContext.promptBlock, webContentBlock);
  const schema = buildSchema(webResults.length);

  // Step 4: Call LLM
  const model = getModel();
  let raw: RawLLMDealsResult | null = null;

  try {
    const generated = await generateObject({ model, schema, prompt });
    raw = generated.object;
  } catch (error) {
    console.error("[deals-finder] AI error:", error);
    return null;
  }

  if (!raw) return null;

  console.log(`[deals-finder] LLM returned ${raw.deals.length} raw deals`);

  // Step 5: Post-process — resolve URLs, filter bad results, classify, diversify
  const result = postProcess(raw, webResults, options.searchTerm);

  console.log(`[deals-finder] Post-processing: ${raw.deals.length} raw → ${result.deals.length} final`);

  return result;
}

// ============================================
// Web content block builder
// ============================================

const RAW_CONTENT_MAX_LENGTH = 3000;

function buildWebContentBlock(results: WebSearchResult[]): string {
  const blocks = results.map((r, i) => {
    const content = r.rawContent
      ? truncateContent(r.rawContent, RAW_CONTENT_MAX_LENGTH)
      : r.snippet;
    return `### [${i}] ${r.title} (${r.source})\n${content}`;
  });
  return `## Fuentes web — Información actual\n\n${blocks.join("\n\n")}`;
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return `${content.slice(0, maxLength)}...[contenido truncado]`;
}

// ============================================
// Post-processing
// ============================================

/** Try to parse a price string like "$4.970,00" or "$3500" into a number. */
function parsePrice(priceStr: string): number | null {
  const cleaned = priceStr.replace(/[$ \t]/g, "");
  // Argentine format: "4.970,00" → dots as thousands, comma as decimal
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  // Standard format: "4970.00"
  const parsed = parseFloat(cleaned.replace(/,/g, ""));
  return isNaN(parsed) ? null : parsed;
}

/** Check if a deal's validity text references an old year (e.g. "2020", "2021"). */
function isExpiredOffer(validUntil: string, detail: string): boolean {
  const combined = `${validUntil} ${detail}`.toLowerCase();
  // Look for year references like (2020), (2021), etc.
  const yearMatches = combined.match(/\b(20\d{2})\b/g);
  if (!yearMatches) return false;
  // If any mentioned year is too old, filter it out
  return yearMatches.some((y) => parseInt(y, 10) < MIN_VALID_YEAR);
}

/** Check if a deal is wholesale/bulk-only (not for end consumers). */
function isWholesaleOffer(detail: string, storeName: string): boolean {
  const combined = `${detail} ${storeName}`.toLowerCase();
  return WHOLESALE_KEYWORDS.some((keyword) => combined.includes(keyword));
}

/** Calculate savings percentage from two prices. */
function calculateSavingsPercent(discountedPrice: number, regularPrice: number): number {
  if (regularPrice <= 0) return 0;
  return Math.round(((regularPrice - discountedPrice) / regularPrice) * 100);
}

/** Check if discountDescription is too vague to be useful (e.g. just "Oferta"). */
function isVagueDiscount(description: string | null | undefined): boolean {
  if (!description) return true;
  return VAGUE_DISCOUNTS.includes(description.trim().toLowerCase());
}

/**
 * Detect dates like "del 22 al 24 de febrero" without an explicit year.
 * These are unreliable — the source might be from a past year.
 * Returns true if the validity text has a month name but no year.
 */
function hasDateWithoutYear(validUntil: string): boolean {
  const lower = validUntil.toLowerCase();
  const hasMonth = MONTHS_ES.some((m) => lower.includes(m));
  if (!hasMonth) return false;
  const hasYear = /\b(20\d{2})\b/.test(lower);
  return !hasYear;
}

/** Format a numeric price to Argentine "$X.XXX" format. */
function formatPriceARS(amount: number): string {
  const formatted = Math.round(amount).toLocaleString("es-AR");
  return `$${formatted}`;
}

function postProcess(
  raw: RawLLMDealsResult,
  webResults: WebSearchResult[],
  searchTerm: string,
): DealsResult {
  const classifiedDeals = raw.deals
    .filter((deal) => deal.productName && deal.store)
    .filter((deal) => !isExpiredOffer(deal.validUntil, deal.detail))
    .filter((deal) => !isWholesaleOffer(deal.detail, deal.store))
    // Classify into Habita domain — reject products outside scope
    .reduce<DealResult[]>((acc, deal) => {
      const category = classifyHabita(deal.productName, deal.detail);
      if (!category) {
        console.log(`[deals-finder] Classifier rejected: "${deal.productName}" (detail: "${deal.detail}")`);
        return acc;
      }

      const sourceIndex = deal.sourceIndex;
      const webSource = sourceIndex >= 0 && sourceIndex < webResults.length
        ? webResults[sourceIndex]
        : null;

      // Fix inverted prices: discountedPrice should be lower than regularPrice
      let discountedNum = parsePrice(deal.discountedPrice);
      let regularNum = deal.regularPrice ? parsePrice(deal.regularPrice) : null;

      if (discountedNum !== null && regularNum !== null && discountedNum > regularNum) {
        const temp = discountedNum;
        discountedNum = regularNum;
        regularNum = temp;
      }

      // Normalize prices to consistent "$X.XXX" format
      const finalPrice = discountedNum !== null
        ? formatPriceARS(discountedNum)
        : deal.discountedPrice;
      const finalOriginalPrice = regularNum !== null
        ? formatPriceARS(regularNum)
        : null;

      // Calculate savings percentage
      const savingsPercent =
        discountedNum !== null && regularNum !== null && regularNum > discountedNum
          ? calculateSavingsPercent(discountedNum, regularNum)
          : null;

      // If the discount description is vague/null and we have a savings %, replace it
      let discountLabel = deal.discountDescription ?? "";
      if (isVagueDiscount(discountLabel) && savingsPercent !== null && savingsPercent > 0) {
        discountLabel = `${savingsPercent}% off`;
      } else if (isVagueDiscount(discountLabel)) {
        discountLabel = "Precio promocional";
      }

      // Fix dates without year — unreliable, mark accordingly
      let validUntil = deal.validUntil;
      if (hasDateWithoutYear(validUntil)) {
        validUntil = "Vigencia no confirmada";
      }

      const tipParts: string[] = [];
      if (deal.storeAddress) tipParts.push(deal.storeAddress);
      if (deal.detail) tipParts.push(deal.detail);

      acc.push({
        title: deal.productName,
        store: deal.store,
        price: finalPrice,
        originalPrice: finalOriginalPrice,
        discount: discountLabel,
        savingsPercent,
        validUntil,
        sourceUrl: webSource?.url ?? "",
        source: webSource ? extractDomain(webSource.url) : "",
        tip: tipParts.join(" · "),
        distanceKm: null as number | null,
        category,
      });
      return acc;
    }, []);

  // Diversify by category for broad/generic searches
  const isBroadSearch = !searchTerm.trim() || isBroadSearchTerm(searchTerm);
  const finalDeals = isBroadSearch
    ? diversifyByCategory(classifiedDeals, 2)
    : classifiedDeals;

  return {
    summary: raw.summary,
    deals: finalDeals,
  };
}

// ============================================
// Prompt builder
// ============================================

function buildPrompt(
  options: DealFinderOptions,
  regionalBlock: string,
  webContentBlock: string
): string {
  const { city, country, searchTerm } = options;
  const location = buildLocationString(city, country);

  const searchContext = searchTerm.trim()
    ? `para "${searchTerm}"`
    : `generales`;

  return `
Eres un extractor profesional de promociones en ${country}.

OBJETIVO:
Extraer hasta 10 productos específicos de consumo cotidiano del hogar en ${location}, con precios reales visibles en las fuentes.
Buscamos ofertas ${searchContext}.

DOMINIO — Solo productos que se reponen regularmente en un hogar:
- Alimentos y bebidas
- Limpieza del hogar
- Higiene personal
- Mascotas (alimento, arena)
- Farmacia básica (analgésicos, vitaminas, curitas)

Excluir: tecnología, electrodomésticos, muebles, ropa, herramientas, vehículos, servicios.

CRITERIOS DE SELECCIÓN (cuando hay más de 10 posibles):
1. Priorizar productos con descuento explícito (30%, 2x1, 2do al 70%).
2. Priorizar aquellos con precio original Y precio con descuento.
3. Priorizar variedad de productos — no múltiples variantes del mismo tipo.
4. Priorizar marcas reconocidas.

EXACTITUD:
- Solo usar datos explícitos de las fuentes. No inferir.
- Producto con marca y presentación (ej: "Coca Cola 2.25L"). Nunca genérico.
- Precio visible en la fuente. Copiar tal cual.
- Si un dato no aparece, usar null.

RESTRICCIONES:
- Máximo 10 resultados.
- No repetir el mismo producto.
- Ignorar ofertas mayoristas o por bulto.
- Ignorar ofertas claramente antiguas (2020, 2021, etc).

CAMPOS:
- productName: Nombre exacto con marca y presentación.
- store: Comercio exacto.
- storeAddress: Dirección si aparece, sino null.
- discountedPrice: Precio final visible.
- regularPrice: Precio original si aparece, sino null.
- discountDescription: Solo si es concreto (30% off, 2x1, etc). Si no hay descuento claro, null.
- validUntil: Fecha solo si tiene año explícito. Si no, "Vigencia no confirmada".
- sourceIndex: Índice de la fuente [0..N].
- detail: Presentación, cantidad, condición del descuento.
- summary: Máximo 20 palabras, mencionar al menos un producto concreto y un comercio.

${regionalBlock}

${webContentBlock}

Responder únicamente en JSON válido según el schema.
`;
}

