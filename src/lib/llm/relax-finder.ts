import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { isAIEnabled, getAIProviderType } from "./provider";
import { buildRegionalContext } from "./regional-context";
import { searchLocalEvents } from "@/lib/web-search";

import type { LanguageModel } from "ai";
import type { WebSearchResult } from "@/lib/web-search";

// ============================================
// Types
// ============================================

export type RelaxSection = "culture" | "restaurants" | "weekend";

export interface RelaxEvent {
  title: string;
  description: string;
  category: string;
  venue: string;
  dateInfo: string;
  priceRange: string;
  familyFriendly: boolean;
  url: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  relevanceNote: string;
  practicalTips: string;
  distanceKm: number | null;
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
  familyFriendly: boolean;
  relevanceNote: string;
  practicalTips: string;
}

interface RawLLMResult {
  events: RawLLMEvent[];
  summary: string;
}

// ============================================
// Categories per section
// ============================================

const CULTURE_CATEGORIES = [
  "cine", "teatro", "musica", "exposiciones",
  "gastronomia", "festivales", "deportes_culturales", "talleres",
] as const;

const RESTAURANT_CATEGORIES = [
  "restaurantes", "bares", "cafes", "cervecerias",
  "heladerias", "pizzerias", "comida_rapida", "parrillas",
] as const;

const WEEKEND_CATEGORIES = [
  "paseos", "excursiones", "mercados", "parques",
  "deportes", "picnic", "turismo", "familiar",
] as const;

const SECTION_CATEGORIES: Record<RelaxSection, readonly string[]> = {
  culture: CULTURE_CATEGORIES,
  restaurants: RESTAURANT_CATEGORIES,
  weekend: WEEKEND_CATEGORIES,
};

// ============================================
// Schema factory
// ============================================

function buildSchema(categories: readonly string[], webResultCount: number) {
  const eventSchema = z.object({
    title: z.string().min(1)
      .describe("Nombre exacto del evento, película, restaurante o actividad (extraído de la fuente web)"),
    venue: z.string().min(1)
      .describe("Nombre del lugar o dirección donde ocurre"),
    sourceIndex: z.number().int().min(0).max(Math.max(webResultCount - 1, 0))
      .describe("Índice de la fuente web [0..N] de donde se extrajo esta información"),
    description: z.string()
      .describe("Descripción en 2-3 oraciones con datos concretos extraídos de la fuente"),
    category: z.enum(categories as [string, ...string[]])
      .describe("Categoría"),
    dateInfo: z.string()
      .describe("Fecha y horario CONCRETO extraído de la fuente. Si no hay dato exacto: 'Consultar horarios'"),
    priceRange: z.string()
      .describe("Precio concreto extraído de la fuente, o: Gratis, Bajo ($), Medio ($$), Alto ($$$)"),
    familyFriendly: z.boolean()
      .describe("Apto para familias con niños"),
    relevanceNote: z.string()
      .describe("Por qué es relevante ahora"),
    practicalTips: z.string()
      .describe("Consejos prácticos: cómo llegar, mejor horario, qué llevar"),
  });

  return z.object({
    events: z.array(eventSchema),
    summary: z.string().describe("Resumen de 1 oración sobre las sugerencias"),
  });
}

// ============================================
// Model selection
// ============================================

function getModel(): LanguageModel | null {
  const providerType = getAIProviderType();

  if (providerType === "openrouter") {
    return null;
  }

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
  const providerType = getAIProviderType();
  const regionalContext = await buildRegionalContext({
    latitude: options.latitude,
    longitude: options.longitude,
    timezone: options.timezone,
    country: options.country,
    city: options.city,
  });

  // Step 3: Build prompt with full web content
  const webContentBlock = buildWebContentBlock(webResults);
  const prompt = buildPrompt(options, regionalContext.promptBlock, regionalContext.localHour, webContentBlock);
  const schema = buildSchema(SECTION_CATEGORIES[options.section], webResults.length);

  // Step 4: Call LLM
  let raw: RawLLMResult | null = null;

  if (providerType === "openrouter") {
    try {
      raw = await callOpenRouter(prompt, options.section, webResults.length);
    } catch (error) {
      console.error(`OpenRouter ${options.section} error:`, error);
      return null;
    }
  } else {
    const model = getModel();
    if (!model) return null;

    try {
      const generated = await generateObject({ model, schema, prompt });
      raw = generated.object;
    } catch (error) {
      console.error(`AI ${options.section} error:`, error);
      return null;
    }
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
  return {
    summary: raw.summary,
    events: raw.events
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
          distanceKm: null,
          description: event.description,
          category: event.category,
          dateInfo: event.dateInfo,
          priceRange: event.priceRange,
          familyFriendly: event.familyFriendly,
          relevanceNote: event.relevanceNote,
          practicalTips: event.practicalTips,
        };
      }),
  };
}

// ============================================
// Utility functions
// ============================================

function buildGoogleMapsUrl(venue: string, city: string): string {
  const destination = encodeURIComponent(`${venue}, ${city}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

// ============================================
// Prompt builder
// ============================================

const ANTI_HALLUCINATION_RULES = `## REGLA ABSOLUTA — EXTRACCIÓN, NO INVENCIÓN
- Solo podés extraer información que esté PRESENTE en las fuentes web de arriba.
- NO inventes eventos, películas, restaurantes, horarios ni precios que no aparezcan en las fuentes.
- Cada evento que devuelvas DEBE referenciar una fuente web con "sourceIndex" (0, 1, 2, ...).
- Si una fuente web no tiene datos concretos (fecha, hora, precio), indicá "Consultar en el lugar" en vez de inventar.
- Extraé entre 8 y 15 eventos/lugares de las fuentes disponibles.
- NUNCA repitas el mismo evento (mismo título + venue) dos veces.
- Si las fuentes no tienen suficiente información para una categoría, devolvé menos resultados pero verídicos.`;

function buildPrompt(
  options: RelaxFinderOptions,
  regionalBlock: string,
  localHour: number,
  webContentBlock: string
): string {
  const { city, country, section } = options;

  const sectionIntros: Record<RelaxSection, string> = {
    culture: `Eres un experto en eventos culturales y actividades locales en ${country}.
De las siguientes fuentes web sobre ${city}, ${country}, EXTRAÉ los mejores eventos y actividades CULTURALES: películas en cartelera con horarios, obras de teatro con fechas, conciertos, exposiciones en museos, festivales, talleres.`,
    restaurants: `Eres un experto en gastronomía y vida nocturna en ${country}.
De las siguientes fuentes web sobre ${city}, ${country}, EXTRAÉ los mejores RESTAURANTES, BARES y lugares para COMER O TOMAR ALGO: nombres reales, direcciones, especialidades, horarios, rango de precios.`,
    weekend: `Eres un experto en actividades de fin de semana y tiempo libre en ${country}.
De las siguientes fuentes web sobre ${city}, ${country}, EXTRAÉ las mejores actividades para el FIN DE SEMANA: eventos al aire libre, ferias, mercados, excursiones, deportes, planes familiares.`,
  };

  const categoryBlocks: Record<RelaxSection, string> = {
    culture: `## Categorías (asigná una a cada evento extraído)
- cine: Películas, funciones, cartelera, festivales de cine
- teatro: Teatro, stand-up comedy, danza, circo, espectáculos
- musica: Conciertos, recitales, música en vivo, festivales musicales
- exposiciones: Museos, galerías de arte, muestras, centros culturales
- gastronomia: Ferias gastronómicas, mercados, food trucks, catas
- festivales: Festivales culturales, ferias artesanales, eventos barriales
- deportes_culturales: Yoga al aire libre, caminatas guiadas, ciclismo urbano
- talleres: Talleres de arte, cerámica, fotografía, escritura`,
    restaurants: `## Categorías (asigná una a cada lugar extraído)
- restaurantes: Restaurantes de todo tipo (cocina local, internacional, de autor)
- bares: Bares, pubs, wine bars, speakeasies, coctelería
- cafes: Cafés de especialidad, confiterías, casas de té, brunch
- cervecerias: Cervecerías artesanales, taprooms, beer gardens
- heladerias: Heladerías artesanales, gelaterías
- pizzerias: Pizzerías, pizza al paso, pizza a la piedra
- comida_rapida: Hamburgueserías, food trucks, empanadas, choripán
- parrillas: Parrillas, asadores, restaurantes de carnes`,
    weekend: `## Categorías (asigná una a cada actividad extraída)
- paseos: Paseos urbanos, recorridos temáticos, caminatas, ferias callejeras
- excursiones: Excursiones de un día, escapadas, pueblos cercanos, sierras
- mercados: Mercados de pulgas, ferias artesanales, mercados orgánicos
- parques: Parques públicos, reservas naturales, jardines botánicos, plazas
- deportes: Actividades deportivas recreativas: bici, kayak, running, escalada
- picnic: Spots para picnic, churrasqueras, food trucks en parques
- turismo: Atracciones turísticas, miradores, museos interactivos
- familiar: Planes para familias: granjas, acuarios, parques temáticos, talleres infantiles`,
  };

  const mealContext = section === "restaurants" ? `\n${getMealContext(localHour)}\n` : "";

  const instructions = `## Instrucciones
1. EXTRAÉ entre 8 y 15 eventos/lugares/actividades de las fuentes web que sean relevantes para la sección "${section}"
2. Asigná a cada uno la categoría que mejor le corresponda
3. IGNORÁ información de las fuentes que no sea relevante para esta sección
4. Adaptá al clima y estación actual si hay información disponible
5. Incluí al menos 3 opciones aptas para familias con niños
6. Incluí al menos 2 opciones gratuitas o de bajo costo
7. title: El nombre EXACTO del evento, película, restaurante o actividad como aparece en la fuente
8. venue: El nombre del lugar o dirección EXACTA como aparece en la fuente
9. dateInfo: Fecha y horario CONCRETO extraído de la fuente. Si no hay dato exacto, poné "Consultar horarios". NUNCA inventes fechas ni horarios
10. priceRange: Precio extraído de la fuente, o "Gratis", "Bajo ($)", "Medio ($$)", "Alto ($$$)"
11. description: Incluí datos concretos de la fuente — para cines: películas en cartelera; para teatro: nombre de la obra; para restaurantes: platos destacados; para eventos: qué se hace
12. sourceIndex: OBLIGATORIO — el número de la fuente web [0], [1], [2]... de donde extrajiste la información
13. relevanceNote: por qué es relevante ahora (clima, estación, horario, feriado cercano)
14. practicalTips: consejos concretos (cómo llegar, qué llevar, si conviene reservar, mejor horario)`;

  return [
    sectionIntros[section],
    "",
    regionalBlock,
    mealContext,
    webContentBlock,
    "",
    ANTI_HALLUCINATION_RULES,
    "",
    categoryBlocks[section],
    "",
    instructions,
  ].join("\n");
}

function getMealContext(localHour: number): string {
  if (localHour < 10) {
    return `## Momento del día: DESAYUNO (antes de las 10AM)
- Priorizá lugares ideales para desayunar o hacer brunch: cafés, confiterías, panaderías.
- Incluí opciones de medialunas, tostadas, huevos, jugos, café de especialidad.
- Mencioná si abren temprano y si son buenos para ir en familia.`;
  }
  if (localHour < 15) {
    return `## Momento del día: ALMUERZO (10AM - 15PM)
- Priorizá lugares ideales para almorzar: restaurantes con menú del mediodía, parrillas, cantinas.
- Incluí opciones con menú ejecutivo o del día si es entre semana.
- Mencioná platos principales recomendados y si conviene reservar.`;
  }
  if (localHour < 19) {
    return `## Momento del día: MERIENDA (15PM - 19PM)
- Priorizá lugares ideales para merendar: cafés, confiterías, heladerías, cervecerías.
- Incluí opciones de tortas, medialunas, helado, café, cerveza artesanal.
- Mencioná si tienen terraza o espacio agradable para la tarde.`;
  }
  return `## Momento del día: CENA (19PM - medianoche)
- Priorizá lugares ideales para cenar: restaurantes, parrillas, bares con cocina, pubs.
- Incluí opciones para cena tranquila en familia y también para salir con amigos.
- Mencioná si conviene reservar, si tienen happy hour, y especialidades nocturnas.`;
}

// ============================================
// OpenRouter
// ============================================

function buildOpenRouterCategoryList(section: RelaxSection): string {
  return SECTION_CATEGORIES[section].map((c) => `"${c}"`).join(" | ");
}

async function callOpenRouter(
  prompt: string,
  section: RelaxSection,
  webResultCount: number
): Promise<RawLLMResult | null> {
  const { OpenRouter } = await import("@openrouter/sdk");
  const client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

  const categoryList = buildOpenRouterCategoryList(section);

  const result = await client.chat.send({
    chatGenerationParams: {
      model: "openrouter/auto",
      messages: [
        {
          role: "system",
          content: `Eres un experto en recomendaciones locales. Responde SOLO con JSON válido siguiendo este schema.
IMPORTANTE: EXTRAÉ información real de las fuentes web proporcionadas. NO inventes datos.
sourceIndex debe ser un número entero entre 0 y ${webResultCount - 1} que referencia la fuente web de donde extrajiste la información.
{
  "events": [
    {
      "title": "string (nombre exacto del evento/lugar)",
      "venue": "string (dirección o nombre del lugar)",
      "sourceIndex": number (0 a ${webResultCount - 1}),
      "description": "string (datos concretos de la fuente)",
      "category": ${categoryList},
      "dateInfo": "string (fecha/horario concreto de la fuente)",
      "priceRange": "string",
      "familyFriendly": boolean,
      "relevanceNote": "string",
      "practicalTips": "string"
    }
  ],
  "summary": "string"
}`,
        },
        { role: "user", content: prompt },
      ],
      stream: false,
    },
  });

  const message = result.choices?.[0]?.message;
  const text = typeof message?.content === "string" ? message.content : "{}";

  return parseRelaxJSON(text);
}

/** Attempt to parse LLM JSON output, repairing truncated arrays if needed. */
function parseRelaxJSON(text: string): RawLLMResult | null {
  // First try: direct parse
  try {
    return JSON.parse(text) as RawLLMResult;
  } catch {
    // noop
  }

  // Second try: extract JSON object from markdown fences or surrounding text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as RawLLMResult;
    } catch {
      // noop
    }

    // Third try: repair truncated JSON — close open arrays/objects
    try {
      const repaired = repairTruncatedJSON(jsonMatch[0]);
      return JSON.parse(repaired) as RawLLMResult;
    } catch {
      // noop
    }
  }

  console.error("[relax-finder] Failed to parse OpenRouter JSON response");
  return null;
}

/**
 * Attempt to repair JSON truncated mid-array or mid-object.
 * Removes the last incomplete element and closes brackets.
 */
function repairTruncatedJSON(json: string): string {
  // Remove trailing incomplete object (after last complete }, before truncation)
  let repaired = json.replace(/,\s*\{[^}]*$/, "");

  // Count open brackets and close them
  const openBraces = (repaired.match(/\{/g) ?? []).length;
  const closeBraces = (repaired.match(/\}/g) ?? []).length;
  const openBrackets = (repaired.match(/\[/g) ?? []).length;
  const closeBrackets = (repaired.match(/\]/g) ?? []).length;

  repaired += "]".repeat(Math.max(0, openBrackets - closeBrackets));
  repaired += "}".repeat(Math.max(0, openBraces - closeBraces));

  return repaired;
}
