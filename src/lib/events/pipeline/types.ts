/**
 * Pipeline-specific types — intermediate data shapes between stages.
 *
 * Flow: DiscoveredUrl (with markdown) → ExtractedEvent → ValidatedEvent
 *       → (persist) → ScoredEvent → (update DB)
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
// Stage 3: Crawled Page (for DeepSeek extraction)
// ============================================

/** Page content ready for DeepSeek extraction. */
export interface CrawledPage {
  url: string;
  domain: string;
  markdown: string;
}

// ============================================
// Stage 4: Event Extraction (DeepSeek)
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
// Stage 5: Deterministic Validation
// ============================================

/** Event that passed all deterministic validation checks. */
export interface ValidatedEvent extends ExtractedEvent {
  /** Which checks this event passed (all must be true). */
  validationFlags: {
    dateValid: boolean;
    dateFuture: boolean;
    titleMinLength: boolean;
    venueNonEmpty: boolean;
    sourceUrlValid: boolean;
    cityMentioned: boolean;
    notWrongLocation: boolean;
  };
}

// ============================================
// Stage 6: Source Yield Control
// ============================================

/** Yield report for a single source domain. */
export interface SourceYieldReport {
  domain: string;
  totalExtracted: number;
  validCount: number;
  invalidCount: number;
  invalidRate: number;
  /** false if <2 valid OR >70% invalid. */
  accepted: boolean;
}

// ============================================
// Stage 9: Cultural Scoring (DeepSeek)
// ============================================

/** Cultural scoring result from DeepSeek. */
export interface ScoredEvent {
  culturalCategory: string;
  culturalInterestScore: number;
  originalityScore: number;
  commercialVsIndependent: "commercial" | "independent" | "mixed";
  editorialHighlight: string;
}

/** Scored event ready for DB update. */
export interface ScoredEventWithId {
  eventId: string;
  scoring: ScoredEvent;
  finalScore: number;
}
