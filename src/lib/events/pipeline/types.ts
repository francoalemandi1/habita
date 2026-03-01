/**
 * Pipeline-specific types — intermediate data shapes between stages.
 *
 * Flow: DiscoveredUrl (with markdown) → ExtractedEvent → FilteredEvent
 *       → CuratedEvent → (persist with scores)
 */

// ============================================
// Stage 1: URL Discovery + Content (Tavily)
// ============================================

/** URL discovered by Tavily search, with optional raw markdown content. */
export interface DiscoveredUrl {
  url: string;
  domain: string;
  title: string;
  snippet: string;
  /** Markdown content from Tavily includeRawContent. Null if Tavily didn't return it. */
  rawContent: string | null;
}

// ============================================
// Stage 2: Crawled Page (for DeepSeek extraction)
// ============================================

/** Page content ready for DeepSeek extraction. */
export interface CrawledPage {
  url: string;
  domain: string;
  markdown: string;
}

// ============================================
// Stage 3: Event Extraction (DeepSeek)
// ============================================

/** Event extracted by DeepSeek from a crawled page (strict JSON). */
export interface ExtractedEvent {
  title: string;
  /** ISO 8601 date string (YYYY-MM-DD). Required — discard if missing. */
  date: string;
  /** Start time in HH:MM 24h format, or null if not found. */
  time: string | null;
  /** Venue name. Required — discard if missing. */
  venue: string;
  /** Street address, or null if not found. */
  address: string | null;
  /** Category guess from DeepSeek (e.g., "teatro", "cine", "musica"). */
  categoryGuess: string;
  /** Factual description in Spanish, max 300 characters. */
  description: string;
  /** Lowest ticket price in ARS, 0 if free, null if unknown. */
  priceMin: number | null;
  /** Highest ticket price in ARS, null if same as priceMin or unknown. */
  priceMax: number | null;
  /** Artist/performer names. */
  artists: string[];
  /** Source URL where event was found. Required. */
  sourceUrl: string;
}

/** Extraction result for a single crawled page. */
export interface PageExtractionResult {
  sourceUrl: string;
  domain: string;
  events: ExtractedEvent[];
  /** Total events DeepSeek returned before validation. */
  rawCount: number;
}

// ============================================
// Stage 4: Deterministic Filter
// ============================================

/** Event that passed deterministic filters (date future + not wrong location). */
export interface FilteredEvent {
  title: string;
  date: string;
  time: string | null;
  venue: string;
  address: string | null;
  categoryGuess: string;
  description: string;
  priceMin: number | null;
  priceMax: number | null;
  artists: string[];
  sourceUrl: string;
}

// ============================================
// Stage 5: Curator (DeepSeek)
// ============================================

/** Event after curator scoring — ready for persistence. */
export interface CuratedEvent extends FilteredEvent {
  culturalCategory: string;
  culturalScore: number;
  originalityScore: number;
  editorialHighlight: string;
  finalScore: number;
}
