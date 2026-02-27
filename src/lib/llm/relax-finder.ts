import { generateObject } from "ai";
import { z } from "zod";
import { isAIEnabled } from "./provider";
import { getDeepSeekModel } from "./deepseek-provider";
import { buildRegionalContext } from "./regional-context";
import { searchAndExtractLocalEvents, ISO_TO_COUNTRY_NAME } from "@/lib/web-search";

import type { WebSearchResult, ExtractedEventWithSource } from "@/lib/web-search";

// ============================================
// Types — public API (unchanged)
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
  isVerified?: boolean;
  /** LLM-selected highlight: why this event is a must-see */
  highlightReason: string | null;
  /** Direct link to buy tickets (extracted from source) */
  ticketUrl: string | null;
  /** Direct link to book/reserve (extracted from source) */
  bookingUrl: string | null;
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

// ============================================
// Types — internal (Curator output)
// ============================================

/** Curated event output from the curator LLM */
interface CuratedEvent {
  title: string;
  venue: string;
  sourceIndex: number;
  description: string;
  category: string;
  dateInfo: string;
  priceRange: string;
  audience?: string;
  tip?: string;
  highlightReason?: string;
  ticketUrl?: string;
  bookingUrl?: string;
}

interface CuratedResult {
  events: CuratedEvent[];
  summary: string;
}

/** Item format passed to the curator prompt (mapped from Firecrawl output) */
interface CuratorInputItem {
  title: string;
  venue: string;
  dateText: string | null;
  timeText: string | null;
  priceText: string | null;
  description: string;
  sourceIndex: number;
  ticketUrl?: string;
  bookingUrl?: string;
}

// ============================================
// Categories per section
// ============================================

const ACTIVITIES_CATEGORIES = [
  "cine", "teatro", "musica", "muestras", "ferias",
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

/** Schema for the curator LLM — analysis and curation */
function buildCuratorSchema(categories: readonly string[], totalSourceCount: number) {
  const eventSchema = z.object({
    title: z.string().min(1),
    venue: z.string().min(1),
    sourceIndex: z.number().int().min(0).max(Math.max(totalSourceCount - 1, 0)),
    description: z.string(),
    category: z.enum(categories as [string, ...string[]]),
    dateInfo: z.string(),
    priceRange: z.string(),
    audience: z.string().optional(),
    tip: z.string().optional(),
    highlightReason: z.string().optional(),
    ticketUrl: z.string().url().optional(),
    bookingUrl: z.string().url().optional(),
  });

  return z.object({
    events: z.array(eventSchema),
    summary: z.string(),
  });
}

// ============================================
// Main function
// ============================================

/**
 * Generate suggestions for a given section and location.
 *
 * Architecture (Firecrawl extract + curator):
 * 1. Tavily search → URLs + snippets
 * 2. Firecrawl LLM extract → structured events per URL (replaces old Agent 1)
 * 3. Curator LLM (DeepSeek) → curates, categorizes, ranks extracted events
 * 4. Post-process: resolve URLs, filter dates, assign images
 *
 * Why Firecrawl LLM extract: It extracts structured data (title, venue, date,
 * price) directly from each page using the page's own context. This is more
 * accurate than a single LLM reading 200K+ chars of raw HTML/markdown.
 */
export async function generateRelaxSuggestions(
  options: RelaxFinderOptions
): Promise<RelaxResult | null> {
  if (!isAIEnabled()) {
    return null;
  }

  // Step 1: Fetch web results + extracted events
  const { searchResults, extractedEvents } = await searchAndExtractLocalEvents(
    options.city,
    options.country,
    options.section
  );

  if (searchResults.length === 0 && extractedEvents.length === 0) {
    console.error(`[relax-finder] No results for ${options.city} (section: ${options.section})`);
    return null;
  }

  console.log(`[relax-finder] ${options.city}/${options.section}: ${searchResults.length} web sources, ${extractedEvents.length} extracted events`);

  // Step 2: Build shared context (weather, timezone, language variant)
  const regionalContext = await buildRegionalContext({
    latitude: options.latitude,
    longitude: options.longitude,
    timezone: options.timezone,
    country: options.country,
    city: options.city,
  });

  const todayIso = formatLocalDate(regionalContext.localNow, options.timezone);
  const model = getDeepSeekModel();

  // Step 3: Map extracted events to curator input
  const curatorItems = mapToCuratorInput(extractedEvents, searchResults);

  if (curatorItems.length === 0) {
    // Fallback: if Firecrawl extraction returned nothing, use snippets from search
    if (searchResults.length === 0) {
      console.error(`[relax-finder] No extracted events and no search results`);
      return null;
    }
    console.warn(`[relax-finder] No extracted events, falling back to snippet-based items`);
    const snippetItems = searchResults.map((r, i) => ({
      title: r.title,
      venue: r.source,
      dateText: null,
      timeText: null,
      priceText: null,
      description: r.snippet,
      sourceIndex: i,
    }));
    return runCurator(snippetItems, searchResults, options, regionalContext, todayIso, model);
  }

  console.log(`[relax-finder] ${options.city}/${options.section}: ${curatorItems.length} items for curator`);
  for (const item of curatorItems.slice(0, 10)) {
    console.log(`  [item] ${item.title} | ${item.venue} | date: ${item.dateText}`);
  }
  if (curatorItems.length > 10) {
    console.log(`  ... and ${curatorItems.length - 10} more items`);
  }

  return runCurator(curatorItems, searchResults, options, regionalContext, todayIso, model);
}

// ============================================
// Map Firecrawl output → curator input
// ============================================

/**
 * Map ExtractedEventWithSource[] to CuratorInputItem[].
 * Each item gets a sourceIndex pointing to its position in searchResults
 * (for image/URL resolution in post-processing).
 */
function mapToCuratorInput(
  extractedEvents: ExtractedEventWithSource[],
  searchResults: WebSearchResult[],
): CuratorInputItem[] {
  const urlToIndex = new Map<string, number>();
  for (let i = 0; i < searchResults.length; i++) {
    const result = searchResults[i];
    if (result) urlToIndex.set(result.url, i);
  }

  const seen = new Set<string>();

  return extractedEvents
    .map((e) => {
      const sourceIndex = urlToIndex.get(e.sourceUrl) ?? 0;
      return {
        title: e.event.title,
        venue: e.event.venue,
        dateText: e.event.dateText,
        timeText: e.event.timeText,
        priceText: e.event.priceText,
        description: e.event.description,
        sourceIndex,
        ...(e.event.ticketUrl && { ticketUrl: e.event.ticketUrl }),
        ...(e.event.bookingUrl && { bookingUrl: e.event.bookingUrl }),
      };
    })
    .filter((item) => {
      if (!item.title || !item.venue) return false;
      const key = item.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// ============================================
// Curator
// ============================================

async function runCurator(
  items: CuratorInputItem[],
  searchResults: WebSearchResult[],
  options: RelaxFinderOptions,
  regionalContext: { promptBlock: string; localHour: number },
  todayIso: string,
  model: ReturnType<typeof getDeepSeekModel>,
): Promise<RelaxResult | null> {
  const curatorPrompt = buildCuratorPrompt(items, options, regionalContext.promptBlock, regionalContext.localHour, todayIso);
  const curatorSchema = buildCuratorSchema(SECTION_CATEGORIES[options.section], searchResults.length);

  console.log(`[relax-finder] curator: ${items.length} items in, ~${Math.round(curatorPrompt.length / 4000)}K tokens`);

  let curated: CuratedResult;
  try {
    const result = await generateObject({ model, schema: curatorSchema, prompt: curatorPrompt });
    curated = result.object;
  } catch (error) {
    const salvaged = salvageCuratorResponse(error);
    if (salvaged) {
      console.warn(`[relax-finder] curator: salvaged ${salvaged.events.length} events from truncated response`);
      curated = salvaged;
    } else {
      console.error(`[relax-finder] curator error:`, error);
      return null;
    }
  }

  console.log(`[relax-finder] curator: ${curated.events.length} events out`);

  return postProcess(curated, searchResults, options);
}

// ============================================
// Truncated response salvage
// ============================================

/**
 * When DeepSeek hits its output token limit (finishReason: 'length'), the AI SDK
 * throws an error with the partial JSON in `error.text`. We try to extract
 * complete objects from the truncated JSON.
 */
function salvageCuratorResponse(error: unknown): CuratedResult | null {
  const text = (error as { text?: string }).text;
  if (!text || typeof text !== "string") return null;

  try {
    const arrayMatch = text.match(/"events"\s*:\s*\[/);
    if (!arrayMatch?.index) return null;

    const arrayStart = arrayMatch.index + arrayMatch[0].length;
    const arrayText = text.slice(arrayStart);

    const events: CuratedEvent[] = [];
    let depth = 0;
    let objectStart = -1;

    for (let i = 0; i < arrayText.length; i++) {
      const char = arrayText[i];
      if (char === "{") {
        if (depth === 0) objectStart = i;
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0 && objectStart >= 0) {
          const objectStr = arrayText.slice(objectStart, i + 1);
          try {
            const parsed = JSON.parse(objectStr) as CuratedEvent;
            if (parsed.title && parsed.venue) events.push(parsed);
          } catch { /* skip malformed */ }
          objectStart = -1;
        }
      }
    }

    if (events.length === 0) return null;

    const summaryMatch = text.match(/"summary"\s*:\s*"([^"]+)"/);
    const summary = summaryMatch?.[1] ?? "Sugerencias generadas";

    return { events, summary };
  } catch {
    return null;
  }
}

// ============================================
// Post-processing
// ============================================

function postProcess(
  raw: CuratedResult,
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
        imageUrl: null,
        description: event.description,
        category: event.category,
        dateInfo: event.dateInfo,
        priceRange: event.priceRange,
        audience: event.audience ?? null,
        tip: event.tip ?? null,
        highlightReason: event.highlightReason ?? null,
        ticketUrl: event.ticketUrl ?? null,
        bookingUrl: event.bookingUrl ?? null,
      };
    });

  const filteredEvents = filterPastEvents(mappedEvents, options.timezone);

  console.log(`[relax-finder] ${options.city}/${options.section}: curator ${raw.events.length} → mapped ${mappedEvents.length} → after date filter ${filteredEvents.length}`);

  return { summary: raw.summary, events: filteredEvents };
}

// ============================================
// Utility functions
// ============================================

function buildGoogleMapsUrl(venue: string, city: string): string {
  const destination = encodeURIComponent(`${venue}, ${city}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

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

function parseLatestDate(dateInfo: string): Date | null {
  const lower = dateInfo.toLowerCase();

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

function filterPastEvents(events: RelaxEvent[], timezone: string): RelaxEvent[] {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
  const todayStart = new Date(`${todayStr}T00:00:00`);

  const maxFutureDate = new Date(todayStart);
  maxFutureDate.setMonth(maxFutureDate.getMonth() + 2);

  return events.filter((event) => {
    const latestDate = parseLatestDate(event.dateInfo);
    if (!latestDate) return true;
    return latestDate >= todayStart && latestDate <= maxFutureDate;
  });
}

// ============================================
// Curator prompt
// ============================================

/** Category list per section */
const SECTION_CATEGORY_HINTS: Record<RelaxSection, string> = {
  activities: `cine | teatro | musica | muestras | ferias`,
  restaurants: `restaurantes | bares | cafes | cervecerias | heladerias | pizzerias | comida_rapida | parrillas`,
};

const CURATOR_ROLE: Record<RelaxSection, string> = {
  activities: "You are a selective cultural curator. Your job is to pick the 8-12 best events happening NOW in the city. Only include: movies in theaters (cine), plays/shows (teatro), live music/concerts (musica), art exhibitions/museums (muestras), fairs/festivals/markets (ferias). Be concrete: real dates, real venues, real prices. Quality over quantity.",
  restaurants: "You are a local friend who knows where to eat well. Select the best gastronomic finds — places with good reviews that a local would recommend. No chains, no tourist guides.",
};

function buildCuratorPrompt(
  extractedItems: CuratorInputItem[],
  options: RelaxFinderOptions,
  regionalBlock: string,
  localHour: number,
  todayIso: string,
): string {
  const { city, country, section } = options;
  const countryName = ISO_TO_COUNTRY_NAME[country.toUpperCase()] ?? country;
  const mealHint = section === "restaurants" ? getMealHint(localHour) : "";

  const itemsJson = JSON.stringify(extractedItems.map((item) => ({
    title: item.title,
    venue: item.venue,
    dateText: item.dateText,
    timeText: item.timeText,
    priceText: item.priceText,
    description: item.description,
    sourceIndex: item.sourceIndex,
    ...(item.ticketUrl && { ticketUrl: item.ticketUrl }),
    ...(item.bookingUrl && { bookingUrl: item.bookingUrl }),
  })));

  return `# LOCAL EVENT CURATOR

${CURATOR_ROLE[section]}

────────────────────────────────
## General Rules (Strict)
────────────────────────────────
* **Output Language:** All output fields (description, tip, summary) must be written in **Spanish** matching the regional variant below.
* **No Invention Rule:** Never invent data not present in the extracted items. Dates, prices, and venues come from the sources — your job is to normalize format, not fabricate.
* **Geography Rule:** The user is in **${city}, ${countryName}**. Prioritize items in ${city} and its immediate metro area (towns reachable in ~30 min by car). Events from distant cities (different departments, >1 h drive) should only appear if they are unmissable — major festival, internationally known artist. Discard items from other countries with the same city name.
* **Date Rule:** Today is ${todayIso}. Discard items with dates before today or more than 2 months ahead. When dateText has no month (e.g. "Jue 29"), infer the month from context — if the source title mentions a past date range (e.g. "agenda del 26 de enero al 1 de febrero"), those items are old. When in doubt about an ambiguous date, discard the item. If dateText is null, keep it.
* **Freshness Rule:** Prioritize events happening today, tomorrow, and this weekend. The user opens this screen to decide what to do NOW — show the most immediate options first, then fill with upcoming events.

────────────────────────────────
## Context
────────────────────────────────
${regionalBlock}
${mealHint}

────────────────────────────────
## Input: Extracted Items (${extractedItems.length} total)
────────────────────────────────

${itemsJson}

────────────────────────────────
## Output Field Rules
────────────────────────────────
1. **dateInfo**: Normalize dateText + timeText → compact format: "Sáb 1 mar, 20:30h", "Del 15 al 28 feb", "Funciones: 14:00, 16:30, 19:00". If no date → "Consultar".
2. **priceRange**: Normalize priceText → concrete price ("$5000"), range ($/$$/$$$/$$$$), "Gratis", or "Consultar".
3. **description**: 2 factual sentences. First: what it is (from description). Second: one concrete standout detail (artist, price, novelty, duration).
4. **category**: One of: ${SECTION_CATEGORY_HINTS[section]}
5. **highlightReason** (REQUIRED on 2–3 events): Pick the 2–3 events a local friend would recommend first. Reason must be a concrete fact: "Gratis", "Última semana — cierra el 2 mar", "$3000 la entrada", "Estreno esta semana".
6. **tip** (optional): Only if a concrete practical detail exists in the source. "Estacionamiento gratuito", "Reservar por @resto en Instagram". If none → omit.
7. **audience** (optional): Only if clearly evident from the item. If not → omit.
8. **ticketUrl / bookingUrl**: Copy from the item if present. Never invent.

────────────────────────────────
## Tone
────────────────────────────────
Concrete data, not narration. "Comedia musical con Flaco Pailos, $15.000" — not "Una propuesta ideal para disfrutar en familia".

────────────────────────────────
## summary
────────────────────────────────
One sentence telling the user what they'll find in this list.`;
}

/** Short meal-time hint for restaurant section */
function getMealHint(localHour: number): string {
  if (localHour < 10) return "\nMeal period: BREAKFAST — prioritize cafés, brunch, bakeries.";
  if (localHour < 15) return "\nMeal period: LUNCH — prioritize lunch menus, grills, cantinas.";
  if (localHour < 19) return "\nMeal period: AFTERNOON — prioritize cafés, ice cream, craft beer.";
  return "\nMeal period: DINNER — prioritize restaurants, grills, bars with kitchen.";
}
