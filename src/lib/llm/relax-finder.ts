import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { isAIEnabled, getAIProviderType } from "./provider";
import { getDeepSeekModel } from "./deepseek-provider";
import { buildRegionalContext } from "./regional-context";
import { searchLocalEvents } from "@/lib/web-search";

import type { LanguageModel } from "ai";
import type { WebSearchResult } from "@/lib/web-search";

// ============================================
// Types
// ============================================

export type RelaxSection = "activities" | "restaurants";

export interface RelaxEvent {
  title: string;
  description: string;
  category: string;
  venue: string;
  dateInfo: string;
  priceRange: string;
  audience: string | null;
  tip: string | null;
  url: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
}

export interface RelaxResult {
  events: RelaxEvent[];
  summary: string;
}

export interface RelaxFinderOptions {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  section: RelaxSection;
}

/** LLM output: synthesized from web search results */
interface RawLLMEvent {
  title: string;
  venue: string;
  sourceIndex: number;
  description: string;
  category: string;
  dateInfo: string;
  priceRange: string;
  audience?: string;
  tip?: string;
}

interface RawLLMResult {
  events: RawLLMEvent[];
  summary: string;
}

// ============================================
// Categories per section
// ============================================

const ACTIVITIES_CATEGORIES = [
  "cine", "teatro", "musica", "exposiciones",
  "festivales", "mercados", "paseos", "excursiones",
  "talleres",
] as const;

const RESTAURANT_CATEGORIES = [
  "restaurantes", "bares", "cafes", "cervecerias",
  "heladerias", "pizzerias", "comida_rapida", "parrillas",
] as const;

const SECTION_CATEGORIES: Record<RelaxSection, readonly string[]> = {
  activities: ACTIVITIES_CATEGORIES,
  restaurants: RESTAURANT_CATEGORIES,
};

// ============================================
// Schema factory
// ============================================

function buildSchema(categories: readonly string[], webResultCount: number) {
  const eventSchema = z.object({
    title: z.string().min(1),
    venue: z.string().min(1),
    sourceIndex: z.number().int().min(0).max(Math.max(webResultCount - 1, 0)),
    description: z.string(),
    category: z.enum(categories as [string, ...string[]]),
    dateInfo: z.string(),
    priceRange: z.string(),
    audience: z.string().optional(),
    tip: z.string().optional(),
  });

  return z.object({
    events: z.array(eventSchema),
    summary: z.string(),
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
 * Generate suggestions for a given section and location.
 * Architecture:
 * 1. Fetch web content via Tavily (advanced search + rawContent)
 * 2. LLM extracts concrete events/places from the web content
 * The LLM can ONLY extract — it cannot invent data not present in sources.
 */
export async function generateRelaxSuggestions(
  options: RelaxFinderOptions
): Promise<RelaxResult | null> {
  if (!isAIEnabled()) {
    return null;
  }

  // Step 1: Fetch web results from Tavily
  const webResults = await searchLocalEvents(options.city, options.country, options.section);

  if (webResults.length === 0) {
    console.error(`[relax-finder] No web results from Tavily for ${options.city} (section: ${options.section})`);
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
  const todayIso = formatLocalDate(regionalContext.localNow, options.timezone);
  const prompt = buildPrompt(options, regionalContext.promptBlock, regionalContext.localHour, webContentBlock, todayIso);
  const schema = buildSchema(SECTION_CATEGORIES[options.section], webResults.length);

  // Step 4: Call LLM
  const model = getModel();
  let raw: RawLLMResult | null = null;

  try {
    const generated = await generateObject({ model, schema, prompt });
    raw = generated.object;
  } catch (error) {
    console.error(`AI ${options.section} error:`, error);
    return null;
  }

  if (!raw) return null;

  // Step 5: Post-process — resolve source indices to URLs
  return postProcess(raw, webResults, options);
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

function postProcess(
  raw: RawLLMResult,
  webResults: WebSearchResult[],
  options: RelaxFinderOptions
): RelaxResult {
  const mappedEvents = raw.events
    .filter((event) => event.title && event.venue)
    .map((event) => {
      const sourceIndex = event.sourceIndex;
      const webSource = sourceIndex >= 0 && sourceIndex < webResults.length
        ? webResults[sourceIndex]
        : null;
      return {
        title: event.title,
        venue: event.venue,
        url: buildGoogleMapsUrl(event.venue, options.city),
        sourceUrl: webSource?.url ?? null,
        imageUrl: webSource?.imageUrl ?? null,
        description: event.description,
        category: event.category,
        dateInfo: event.dateInfo,
        priceRange: event.priceRange,
        audience: event.audience ?? null,
        tip: event.tip ?? null,
      };
    });

  // Safety net: strip events with dates that have already passed
  const filteredEvents = filterPastEvents(mappedEvents, options.timezone);

  return { summary: raw.summary, events: filteredEvents };
}

// ============================================
// Utility functions
// ============================================

function buildGoogleMapsUrl(venue: string, city: string): string {
  const destination = encodeURIComponent(`${venue}, ${city}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

/** Format a Date as "23 de febrero de 2026" for prompt injection */
function formatLocalDate(date: Date, timezone: string): string {
  try {
    return date.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: timezone,
    });
  } catch {
    return date.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  }
}

const MONTH_ABBR_TO_NUMBER: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

/**
 * Best-effort parser for dateInfo strings like "Sáb 22 feb, 11 a 20h",
 * "4 de febrero", "Del 7 feb al 1 mar", "Vie a dom durante febrero".
 * Returns the latest date mentioned (end date for ranges), or null if unparseable.
 */
function parseLatestDate(dateInfo: string): Date | null {
  const lower = dateInfo.toLowerCase();

  // Match all "day month" patterns in the string (to find the latest one for ranges)
  const allMatches = [...lower.matchAll(/(\d{1,2})\s+(?:de\s+)?(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)/g)];

  if (allMatches.length === 0) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  let latestDate: Date | null = null;

  for (const match of allMatches) {
    const day = parseInt(match[1]!, 10);
    const monthStr = match[2]!.slice(0, 3);
    const month = MONTH_ABBR_TO_NUMBER[monthStr];
    if (month === undefined) continue;

    const date = new Date(currentYear, month, day);
    if (!latestDate || date > latestDate) {
      latestDate = date;
    }
  }

  return latestDate;
}

/**
 * Filter out events whose dateInfo contains only dates in the past.
 * Events with "durante febrero" (month-long) or unparseable dates are kept.
 */
function filterPastEvents(events: RelaxEvent[], timezone: string): RelaxEvent[] {
  const now = new Date();
  // Start of today in local timezone
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
  const todayStart = new Date(`${todayStr}T00:00:00`);

  return events.filter((event) => {
    const latestDate = parseLatestDate(event.dateInfo);
    // If we can't parse, keep the event (benefit of the doubt)
    if (!latestDate) return true;
    // Keep if the latest date is today or later
    return latestDate >= todayStart;
  });
}

// ============================================
// Prompt builder
// ============================================

/** Section-specific role and mission for the LLM */
const SECTION_ROLES: Record<RelaxSection, string> = {
  activities: `Sos un curador de planes que ayuda a una familia a decidir qué hacer esta semana.
Tu misión: extraer de las fuentes lo que está pasando AHORA — shows, películas, ferias, festivales, eventos, paseos, excursiones. Priorizá lo efímero (cosas con fecha) por encima de lo permanente (museos, parques, plazas que están siempre).`,
  restaurants: `Sos un amigo local que sabe dónde se come bien.
Tu misión: extraer de las fuentes descubrimientos gastronómicos — lugares nuevos, con buena reseña, que un local recomendaría. Nada de cadenas ni guías turísticas.`,
};

/** One concrete example per section so the LLM knows the expected output shape */
const SECTION_EXAMPLES: Record<RelaxSection, string> = {
  activities: `{
  "title": "Feria de diseño en el CCK",
  "venue": "Centro Cultural Kirchner, Sarmiento 151",
  "sourceIndex": 1,
  "description": "80 diseñadores independientes con talleres gratuitos para chicos, food trucks y música en vivo. Solo este fin de semana.",
  "category": "mercados",
  "dateInfo": "Sáb 22 y dom 23 de febrero, 11 a 20h",
  "priceRange": "Gratis",
  "audience": "familias con niños",
  "tip": "Ir antes de las 14 — hay estacionamiento en el subsuelo."
}`,
  restaurants: `{
  "title": "Proper",
  "venue": "Av. Álvarez Thomas 1391, Colegiales",
  "sourceIndex": 0,
  "description": "Cocina estacional con menú que rota cada semana. Pastas frescas y fermentados de la casa. Abrió hace 2 meses, buenas reseñas.",
  "category": "restaurantes",
  "dateInfo": "Mar a dom, 12–15h y 20–00h",
  "priceRange": "$$",
  "audience": "parejas",
  "tip": "Reservar por Instagram. El menú de mediodía tiene mejor precio."
}`,
};

/**
 * Category list per section — used in field guide to constrain category assignment.
 */
const SECTION_CATEGORY_HINTS: Record<RelaxSection, string> = {
  activities: `cine | teatro | musica | exposiciones | festivales | mercados | paseos | excursiones | talleres`,
  restaurants: `restaurantes | bares | cafes | cervecerias | heladerias | pizzerias | comida_rapida | parrillas`,
};

function buildPrompt(
  options: RelaxFinderOptions,
  regionalBlock: string,
  localHour: number,
  webContentBlock: string,
  todayIso: string
): string {
  const { city, section } = options;

  const mealHint = section === "restaurants" ? getMealHint(localHour) : "";

  return `## Rol

${SECTION_ROLES[section]}

## Contexto

${regionalBlock}
${mealHint}

## Fuentes

Las fuentes con contenido extenso (rawContent) son más confiables que las que solo tienen snippet. Priorizá fuentes detalladas.

${webContentBlock}

## Reglas estrictas

- EXTRACCIÓN, NO INVENCIÓN: solo usá información presente en las fuentes. Si no está, no existe.
- Cada resultado lleva sourceIndex (0, 1, 2...) apuntando a la fuente de donde salió.
- FILTRO DE FECHA OBLIGATORIO: hoy es ${todayIso}. DESCARTÁ todo evento cuya fecha sea ANTERIOR a hoy. Si un evento dice "4 de febrero" y hoy es 23 de febrero, ese evento YA PASÓ y NO debe incluirse. Esto es innegociable.
- Máximo 2 resultados del mismo venue o fuente — variedad ante todo.
- Priorizá eventos/lugares en ${city}. Si una fuente menciona algo fuera de la ciudad pero vale la pena (festival importante, excursión destacada), incluilo indicando la distancia en tip.
- Si no hay datos suficientes, devolvé menos resultados. 6 buenos > 12 con relleno.
- NUNCA inventes fechas, horarios ni precios. Dato concreto o "Consultar".

## Tono de redacción

- Dato concreto, no narración. "80 diseñadores, talleres gratis, food trucks" — NO "Una propuesta interactiva ideal para disfrutar en familia".
- Prohibido: "ideal para", "imperdible", "oportunidad para", "propuesta", "experiencia única", "no te lo pierdas", "una jornada de", "desembarcando en".
- Si no tenés un dato concreto para un campo opcional (audience, tip), omitilo. Mejor vacío que relleno.

## Guía de campos

Extraé 8-12 resultados. Cada uno lleva:

- **title**: nombre EXACTO de la fuente, sin editar.
- **venue**: lugar EXACTO de la fuente, con dirección si está disponible.
- **sourceIndex**: índice de la fuente (0, 1, 2...).
- **description**: 2 oraciones. Qué se hace/come/ve + por qué destaca (dato concreto: novedad, fecha límite, gratuito, artista). Fusiona el "qué" con el "por qué ir".
- **category**: una de: ${SECTION_CATEGORY_HINTS[section]}
- **dateInfo**: fecha y horario concretos. Formato compacto: "Sáb 22 feb, 11 a 20h". Si no hay dato, "Consultar".
- **priceRange**: precio concreto, rango ($/$$/$$$/$$$$), o "Gratis". Si no hay dato, "Consultar".
- **audience** (opcional): solo si la fuente lo indica explícitamente. "familias con niños", "adultos", "parejas", "todos". Omitir si no hay evidencia.
- **tip** (opcional): 1 oración con dato práctico y concreto de la fuente. "Estacionamiento gratuito en subsuelo", "Reservar por Instagram". Omitir si no hay dato real — NO inventar tips genéricos como "Llegar temprano".
- **summary**: 1 oración que le diga al usuario qué va a encontrar en esta lista.

Incluí al menos 2 opciones gratuitas o de bajo costo.

## Ejemplo

${SECTION_EXAMPLES[section]}`;
}

/** Short meal-time hint for restaurant section (replaces verbose getMealContext) */
function getMealHint(localHour: number): string {
  if (localHour < 10) return "\nMomento del día: DESAYUNO — priorizá cafés, brunch, panaderías.";
  if (localHour < 15) return "\nMomento del día: ALMUERZO — priorizá menú del mediodía, parrillas, cantinas.";
  if (localHour < 19) return "\nMomento del día: MERIENDA — priorizá cafés, heladerías, cervecerías.";
  return "\nMomento del día: CENA — priorizá restaurantes, parrillas, bares con cocina.";
}

// ============================================
// OpenRouter
// ============================================
