import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { isAIEnabled, getAIProviderType } from "./provider";
import { buildRegionalContext } from "./regional-context";

import type { LanguageModel } from "ai";

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

/** Raw event shape from LLM (before post-processing URLs and distance). */
interface RawRelaxEvent extends Omit<RelaxEvent, "url" | "distanceKm"> {
  approximateLatitude: number;
  approximateLongitude: number;
}

interface RawRelaxResult {
  events: RawRelaxEvent[];
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

function buildSectionSchema(categories: readonly string[]) {
  return z.object({
    events: z.array(
      z.object({
        title: z.string().describe("Nombre del lugar o actividad"),
        description: z.string().describe("Descripción en 2-3 oraciones"),
        category: z
          .enum(categories as [string, ...string[]])
          .describe("Categoría"),
        venue: z.string().describe("Nombre del lugar específico"),
        dateInfo: z.string().describe("Cuándo ocurre o horarios habituales"),
        priceRange: z.string().describe("Gratis, Bajo ($), Medio ($$), Alto ($$$), o precio específico"),
        familyFriendly: z.boolean().describe("Apto para familias con niños"),
        relevanceNote: z.string().describe("Por qué es relevante ahora"),
        practicalTips: z.string().describe("Consejos prácticos: cómo llegar, mejor horario, qué llevar, si conviene reservar"),
        approximateLatitude: z.number().describe("Latitud aproximada del lugar (coordenada GPS)"),
        approximateLongitude: z.number().describe("Longitud aproximada del lugar (coordenada GPS)"),
      })
    ),
    summary: z.string().describe("Resumen de 1 oración sobre las sugerencias"),
  });
}

const sectionSchemas: Record<RelaxSection, ReturnType<typeof buildSectionSchema>> = {
  culture: buildSectionSchema(CULTURE_CATEGORIES),
  restaurants: buildSectionSchema(RESTAURANT_CATEGORIES),
  weekend: buildSectionSchema(WEEKEND_CATEGORIES),
};

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
 */
export async function generateRelaxSuggestions(
  options: RelaxFinderOptions
): Promise<RelaxResult | null> {
  if (!isAIEnabled()) {
    return null;
  }

  const providerType = getAIProviderType();

  const regionalContext = await buildRegionalContext({
    latitude: options.latitude,
    longitude: options.longitude,
    timezone: options.timezone,
    country: options.country,
    city: options.city,
  });
  const regionalBlock = regionalContext.promptBlock;

  const promptBuilders: Record<RelaxSection, (city: string, country: string, block: string, localHour: number) => string> = {
    culture: buildCulturePrompt,
    restaurants: buildRestaurantPrompt,
    weekend: buildWeekendPrompt,
  };

  const prompt = promptBuilders[options.section](options.city, options.country, regionalBlock, regionalContext.localHour);
  const schema = sectionSchemas[options.section];

  let raw: RawRelaxResult | null = null;

  if (providerType === "openrouter") {
    try {
      raw = await generateOpenRouter(prompt, options.section);
    } catch (error) {
      console.error(`OpenRouter ${options.section} generation error:`, error);
      return null;
    }
  } else {
    const model = getModel();
    if (!model) {
      return null;
    }

    try {
      const generated = await generateObject({
        model,
        schema,
        prompt,
      });
      raw = generated.object;
    } catch (error) {
      console.error(`AI ${options.section} generation error:`, error);
      return null;
    }
  }

  if (!raw) return null;

  // Post-process: add Google Maps URLs and compute distance from user
  return {
    summary: raw.summary,
    events: raw.events.map((event) => {
      const { approximateLatitude, approximateLongitude, ...rest } = event;
      return {
        ...rest,
        url: buildGoogleMapsUrl(event.venue, options.city),
        distanceKm: haversineDistanceKm(
          options.latitude,
          options.longitude,
          approximateLatitude,
          approximateLongitude
        ),
      };
    }),
  };
}

/** Build a Google Maps search URL from venue name and city. */
function buildGoogleMapsUrl(venue: string, city: string): string {
  const query = encodeURIComponent(`${venue}, ${city}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/** Compute distance in km between two GPS coordinates using the Haversine formula. */
function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const EARTH_RADIUS_KM = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================
// Prompt builders
// ============================================

function buildCulturePrompt(city: string, country: string, regionalBlock: string, _localHour: number): string {
  return `Eres un experto en eventos culturales y actividades locales en ${country}.
Genera recomendaciones de actividades culturales para una familia en ${city}, ${country}.

${regionalBlock}

## RESTRICCIÓN CRÍTICA DE UBICACIÓN
- TODOS los lugares sugeridos DEBEN estar físicamente ubicados en ${city} o su área metropolitana inmediata.
- NO sugieras lugares de otras ciudades, aunque tengan nombres similares o sean cadenas conocidas.
- Si no conocés suficientes lugares reales de ${city}, es preferible sugerir menos opciones antes que inventar o mezclar con otras ciudades.

## Categorías
- cine: Cine, películas, funciones especiales, cine al aire libre
- teatro: Teatro, stand-up comedy, danza, circo, espectáculos
- musica: Conciertos, recitales, festivales de música, música en vivo
- exposiciones: Museos, galerías de arte, muestras fotográficas, centros culturales
- gastronomia: Ferias gastronómicas, mercados, food trucks, catas, clases de cocina
- festivales: Festivales culturales, ferias artesanales, eventos barriales, fiestas populares
- deportes_culturales: Yoga al aire libre, caminatas guiadas, ciclismo urbano, carreras culturales
- talleres: Talleres de arte, cerámica, fotografía, escritura, manualidades

## Instrucciones
1. Genera entre 8 y 12 sugerencias cubriendo al menos 5 categorías distintas
2. Priorizá actividades que REALMENTE existan o sean habituales en ${city}
3. Nombrá lugares reales y específicos (teatros, museos, bares, parques con nombre)
4. Adaptá al clima y estación actual si hay información disponible
5. Incluí al menos 3 opciones aptas para familias con niños
6. Incluí al menos 2 opciones gratuitas o de bajo costo
7. dateInfo debe reflejar la temporalidad real. NO inventes fechas ni días de la semana: usá solo la fecha actual del contexto regional como referencia. Si no sabés la fecha exacta de un evento, usá horarios habituales (ej: "Sábados y domingos 10-18")
8. priceRange: "Gratis", "Bajo ($)", "Medio ($$)", "Alto ($$$)" o un precio específico
9. relevanceNote: explicá por qué la sugerencia es relevante ahora (clima, estación, feriado cercano, etc.)
10. practicalTips: incluí consejos útiles y concretos para cada actividad, por ejemplo:
    - Cómo llegar: líneas de colectivo, si queda cerca de alguna parada conocida, si conviene ir en auto
    - Mejor momento: mejor horario para ir (ej: "ir temprano para evitar filas", "mejor al atardecer por el clima")
    - Qué llevar: protector solar, abrigo, manta para picnic, efectivo, etc.
    - Disponibilidad: si suele llenarse rápido, si conviene reservar, si hay cupo limitado
    - Combinaciones: si se puede combinar con otra actividad cercana
11. approximateLatitude y approximateLongitude: coordenadas GPS aproximadas del lugar (usá tu conocimiento del lugar para dar una coordenada razonable)`;
}

function getMealContext(localHour: number): string {
  if (localHour < 10) {
    return `## Momento del día: DESAYUNO (antes de las 10AM)
- Priorizá lugares ideales para desayunar o hacer brunch: cafés, confiterías, panaderías, hoteles con desayuno.
- Incluí opciones de medialunas, tostadas, huevos, jugos, café de especialidad.
- Mencioná si abren temprano y si son buenos para ir en familia.`;
  }
  if (localHour < 15) {
    return `## Momento del día: ALMUERZO (10AM - 15PM)
- Priorizá lugares ideales para almorzar: restaurantes con menú del mediodía, parrillas, cantinas, fondas.
- Incluí opciones con menú ejecutivo o del día si es entre semana.
- Mencioná platos principales recomendados y si conviene reservar para el mediodía.`;
  }
  if (localHour < 19) {
    return `## Momento del día: MERIENDA (15PM - 19PM)
- Priorizá lugares ideales para merendar o tomar algo por la tarde: cafés, confiterías, casas de té, heladerías, cervecerías.
- Incluí opciones de tortas, medialunas, scones, churros, helado, café, té, cerveza artesanal.
- Mencioná si tienen terraza o espacio agradable para la tarde.`;
  }
  return `## Momento del día: CENA (19PM - medianoche)
- Priorizá lugares ideales para cenar o salir de noche: restaurantes, parrillas, bares con cocina, pubs.
- Incluí opciones para una cena tranquila en familia y también para salir con amigos.
- Mencioná si conviene reservar, si tienen happy hour, y especialidades nocturnas.`;
}

function buildRestaurantPrompt(city: string, country: string, regionalBlock: string, localHour: number): string {
  const mealContext = getMealContext(localHour);

  return `Eres un experto en gastronomía y vida nocturna en ${country}.
Genera recomendaciones de restaurantes, bares y lugares para comer o tomar algo para una familia en ${city}, ${country}.

${regionalBlock}

${mealContext}

## RESTRICCIÓN CRÍTICA DE UBICACIÓN
- TODOS los lugares sugeridos DEBEN estar físicamente ubicados en ${city} o su área metropolitana inmediata.
- NO sugieras lugares de otras ciudades, aunque tengan nombres similares o sean cadenas conocidas.
- Si no conocés suficientes lugares reales de ${city}, es preferible sugerir menos opciones antes que inventar o mezclar con otras ciudades.

## Categorías
- restaurantes: Restaurantes de todo tipo (cocina local, internacional, de autor, etc.)
- bares: Bares, pubs, wine bars, speakeasies, coctelería
- cafes: Cafés de especialidad, confiterías, casas de té, brunch
- cervecerias: Cervecerías artesanales, taprooms, beer gardens
- heladerias: Heladerías artesanales, gelaterías, frozen yogurt
- pizzerias: Pizzerías, pizza al paso, pizza a la piedra
- comida_rapida: Hamburgueserías, food trucks, empanadas, choripán
- parrillas: Parrillas, asadores, restaurantes de carnes

## Instrucciones
1. Genera entre 8 y 12 sugerencias cubriendo al menos 5 categorías distintas
2. Priorizá lugares que REALMENTE existan en ${city} — usá nombres reales
3. Nombrá la dirección o barrio específico
4. Adaptá al clima actual: si hace frío priorizá lugares cerrados y cálidos; si hace calor, terrazas y patios
5. Incluí al menos 3 opciones aptas para familias con niños
6. Incluí al menos 2 opciones de bajo costo
7. dateInfo: horarios habituales de apertura (ej: "Lunes a sábados 12-15 y 20-00")
8. priceRange: "Bajo ($)", "Medio ($$)", "Alto ($$$)" o precio promedio por persona
9. relevanceNote: por qué conviene ir ahora (ej: "temporada de vinos", "abrieron hace poco", "lanzaron menú de invierno")
10. practicalTips: incluí consejos concretos:
    - Si conviene reservar o se puede ir sin reserva
    - Mejor horario para evitar espera
    - Platos o tragos recomendados
    - Si tiene estacionamiento, si queda cerca de transporte público
    - Si tiene espacio al aire libre, si admiten mascotas
    - Si tiene opciones vegetarianas/veganas/celíacas
11. approximateLatitude y approximateLongitude: coordenadas GPS aproximadas del lugar (usá tu conocimiento del lugar para dar una coordenada razonable)`;
}

function buildWeekendPrompt(city: string, country: string, regionalBlock: string, _localHour: number): string {
  return `Eres un experto en actividades de fin de semana y tiempo libre en ${country}.
Genera recomendaciones de actividades para disfrutar el fin de semana para una familia en ${city}, ${country}.

${regionalBlock}

## RESTRICCIÓN CRÍTICA DE UBICACIÓN
- TODOS los lugares sugeridos DEBEN estar físicamente ubicados en ${city} o su área metropolitana inmediata.
- NO sugieras lugares de otras ciudades, aunque tengan nombres similares o sean cadenas conocidas.
- Si no conocés suficientes lugares reales de ${city}, es preferible sugerir menos opciones antes que inventar o mezclar con otras ciudades.

## Categorías
- paseos: Paseos urbanos, recorridos temáticos, caminatas por la ciudad, ferias callejeras
- excursiones: Excursiones de un día, escapadas cerca de la ciudad, pueblos cercanos, sierras, costa
- mercados: Mercados de pulgas, ferias artesanales, mercados orgánicos, antigüedades
- parques: Parques públicos, reservas naturales, jardines botánicos, plazas con juegos
- deportes: Actividades deportivas recreativas: bici, kayak, running, patinaje, escalada
- picnic: Spots para picnic, churrasqueras públicas, food trucks en parques, meriendas al aire libre
- turismo: Atracciones turísticas, miradores, museos interactivos, experiencias culturales
- familiar: Planes específicos para familias: granjas, acuarios, parques temáticos, talleres infantiles

## Instrucciones
1. Genera entre 8 y 12 sugerencias cubriendo al menos 5 categorías distintas
2. Priorizá actividades realizables este fin de semana en ${city} o sus alrededores
3. Nombrá lugares reales y específicos con dirección o zona
4. Adaptá al clima y estación: si llueve, priorizá opciones bajo techo; si hace buen tiempo, al aire libre
5. Incluí al menos 4 opciones aptas para familias con niños
6. Incluí al menos 3 opciones gratuitas o de bajo costo
7. dateInfo: cuándo hacerlo (ej: "Sábados 10-18", "Domingos de mañana", "Todo el fin de semana")
8. priceRange: "Gratis", "Bajo ($)", "Medio ($$)", "Alto ($$$)" o precio específico
9. relevanceNote: por qué es ideal para este fin de semana (clima, evento especial, temporada, feriado)
10. practicalTips: incluí consejos concretos:
    - Cómo llegar: transporte público, si conviene ir en auto, estacionamiento
    - Qué llevar: protector solar, abrigo, manta, comida, agua, efectivo
    - Mejor momento del día para ir
    - Si hay que reservar o llegar temprano
    - Actividades combinables cercanas
    - Duración estimada de la actividad
11. approximateLatitude y approximateLongitude: coordenadas GPS aproximadas del lugar (usá tu conocimiento del lugar para dar una coordenada razonable)`;
}

// ============================================
// OpenRouter fallback
// ============================================

function buildOpenRouterCategoryList(section: RelaxSection): string {
  return SECTION_CATEGORIES[section].map((c) => `"${c}"`).join(" | ");
}

async function generateOpenRouter(
  prompt: string,
  section: RelaxSection
): Promise<RawRelaxResult | null> {
  const { OpenRouter } = await import("@openrouter/sdk");
  const client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

  const categoryList = buildOpenRouterCategoryList(section);

  const result = await client.chat.send({
    chatGenerationParams: {
      model: "openrouter/auto",
      messages: [
        {
          role: "system",
          content: `Eres un experto en recomendaciones locales. Responde SOLO con JSON válido siguiendo este schema:
{
  "events": [
    {
      "title": "string",
      "description": "string",
      "category": ${categoryList},
      "venue": "string",
      "dateInfo": "string",
      "priceRange": "string",
      "familyFriendly": boolean,
      "relevanceNote": "string",
      "practicalTips": "string",
      "approximateLatitude": number,
      "approximateLongitude": number
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

  try {
    const parsed = JSON.parse(text) as RawRelaxResult;
    return parsed;
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as RawRelaxResult;
    }
    return null;
  }
}
