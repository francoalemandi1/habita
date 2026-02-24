/**
 * Constants for the cultural events system.
 */

import type { EventCategory } from "@prisma/client";

// ============================================
// Ingestion limits
// ============================================

/** Max events fetched per cron run (keeps within Vercel 60s limit). */
export const DEFAULT_MAX_EVENTS_PER_RUN = 100;

/** Time budget for provider.fetchEvents() — leave 10s for orchestrator overhead. */
export const PROVIDER_TIMEOUT_MS = 50_000;

// ============================================
// Deduplication thresholds
// ============================================

/** Minimum score (0-100) to consider two events as duplicates. */
export const DUPLICATE_SCORE_THRESHOLD = 60;

/** Max candidates to compare against when checking for duplicates. */
export const DUPLICATE_CANDIDATE_LIMIT = 50;

/** Date proximity window for duplicate candidate search (ms). */
export const DUPLICATE_DATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day

// ============================================
// Category auto-detection keywords
// ============================================

/** Keywords that map to EventCategory for auto-categorization. */
export const CATEGORY_KEYWORDS: Record<EventCategory, string[]> = {
  CINE: ["cine", "pelicula", "film", "cortometraje", "documental", "cinematografico"],
  TEATRO: ["teatro", "obra", "comedia", "drama", "monólogo", "escena", "escénico"],
  MUSICA: ["musica", "concierto", "recital", "banda", "show", "dj", "festival musical", "jazz", "rock", "tango", "folklore"],
  EXPOSICIONES: ["exposicion", "muestra", "galeria", "arte", "instalacion", "fotografia"],
  FESTIVALES: ["festival", "fiesta", "carnaval", "celebracion"],
  MERCADOS: ["feria", "mercado", "bazar", "diseño", "artesanal", "emprendedores"],
  PASEOS: ["paseo", "caminata", "tour", "recorrido", "visita guiada"],
  EXCURSIONES: ["excursion", "trekking", "aventura", "senderismo", "camping"],
  TALLERES: ["taller", "workshop", "curso", "clase", "capacitacion", "seminario"],
  DANZA: ["danza", "baile", "ballet", "contemporanea", "folclore"],
  LITERATURA: ["literatura", "libro", "lectura", "poeta", "escritor", "feria del libro"],
  GASTRONOMIA: ["gastronomia", "food", "cocina", "degustacion", "vino", "cerveza artesanal"],
  DEPORTES: ["deporte", "maraton", "carrera", "torneo", "campeonato"],
  INFANTIL: ["infantil", "niños", "chicos", "familiar", "kids"],
  OTRO: [],
};

// ============================================
// Eventbrite category mapping
// ============================================

/** Maps Eventbrite category IDs to our EventCategory. */
export const EVENTBRITE_CATEGORY_MAP: Record<string, EventCategory> = {
  "103": "MUSICA",
  "104": "CINE",
  "105": "EXPOSICIONES",
  "106": "GASTRONOMIA",
  "107": "MERCADOS",
  "108": "DEPORTES",
  "109": "TALLERES",
  "110": "LITERATURA",
  "113": "INFANTIL",
  "115": "FESTIVALES",
  "116": "TEATRO",
};

// ============================================
// Exa discovery queries (rotated across runs)
// ============================================

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * Query templates — {month} and {year} are replaced dynamically.
 * Mix of mainstream + local/independent + niches to ensure diversity.
 */
const EXA_QUERY_TEMPLATES = [
  // -- Local agendas & independent spaces --
  "agenda centros culturales buenos aires {month} {year}",
  "espacios culturales independientes buenos aires programación",
  "centros culturales barriales CABA agenda semanal",
  "agenda cultural córdoba argentina {month} {year}",
  "centros culturales rosario argentina programación {month}",
  // -- Specific categories (niches, not mainstream) --
  "ferias de diseño independiente buenos aires {month} {year}",
  "ciclo de cine independiente buenos aires {year}",
  "milongas y tango buenos aires agenda semanal",
  "talleres y workshops gratuitos buenos aires {month} {year}",
  "teatro independiente cartelera buenos aires",
  "muestras arte contemporáneo galerías buenos aires",
  "festivales gastronómicos argentina {month} {year}",
  // -- Weekend & family --
  "qué hacer gratis este fin de semana buenos aires",
  "actividades para chicos y familias buenos aires {month} {year}",
  "paseos y excursiones cerca de buenos aires fin de semana",
  // -- Regional cities (always include "argentina" to avoid Spain/other countries) --
  "eventos culturales mendoza argentina {month} {year}",
  "agenda cultural salta tucumán argentina {month} {year}",
  "qué hacer fin de semana mar del plata argentina {month} {year}",
  "eventos culturales la plata argentina {month} {year}",
  "agenda cultural bariloche patagonia argentina {month} {year}",
  // -- Broad discovery --
  "agenda cultural argentina {month} {year}",
  "recitales y shows música en vivo argentina {month} {year}",
  "exposiciones y muestras argentina {month} {year}",
  "festivales y ferias argentina {month} {year}",
] as const;

/** Build discovery queries with current month/year injected. */
export function getExaDiscoveryQueries(): string[] {
  const now = new Date();
  const month = MONTH_NAMES[now.getMonth()]!;
  const year = String(now.getFullYear());

  return EXA_QUERY_TEMPLATES.map((template) =>
    template.replace("{month}", month).replace("{year}", year)
  );
}
