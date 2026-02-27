import type { ExpenseCategory, RecurringFrequency } from "@prisma/client";

export type ServiceSection = "local" | "telecom" | "streaming" | "impuestos" | "hogar" | "salud" | "transporte" | "otros";

export interface ServicePreset {
  title: string;
  provider?: string;
  category: ExpenseCategory;
  frequency: RecurringFrequency;
  /** Provinces where this service operates. Empty = nationwide. */
  provinces: string[];
  /** Display section for UI grouping */
  section: ServiceSection;
}

// ─── Province detection ─────────────────────────────────────────────

/** Normalized province names */
type Province =
  | "CABA"
  | "Buenos Aires"
  | "Catamarca"
  | "Chaco"
  | "Chubut"
  | "Córdoba"
  | "Corrientes"
  | "Entre Ríos"
  | "Formosa"
  | "Jujuy"
  | "La Pampa"
  | "La Rioja"
  | "Mendoza"
  | "Misiones"
  | "Neuquén"
  | "Río Negro"
  | "Salta"
  | "San Juan"
  | "San Luis"
  | "Santa Cruz"
  | "Santa Fe"
  | "Santiago del Estero"
  | "Tierra del Fuego"
  | "Tucumán";

/** Map of common city names → province. Lowercase, without diacritics. */
const CITY_TO_PROVINCE: Record<string, Province> = {
  // CABA (ciudad + barrios que BigDataCloud puede devolver)
  "buenos aires": "CABA",
  "caba": "CABA",
  "ciudad autonoma de buenos aires": "CABA",
  "capital federal": "CABA",
  "palermo": "CABA",
  "belgrano": "CABA",
  "recoleta": "CABA",
  "caballito": "CABA",
  "almagro": "CABA",
  "villa crespo": "CABA",
  "chacarita": "CABA",
  "colegiales": "CABA",
  "nunez": "CABA",
  "devoto": "CABA",
  "villa devoto": "CABA",
  "villa urquiza": "CABA",
  "saavedra": "CABA",
  "flores": "CABA",
  "floresta": "CABA",
  "boedo": "CABA",
  "san telmo": "CABA",
  "la boca": "CABA",
  "barracas": "CABA",
  "san cristobal": "CABA",
  "monserrat": "CABA",
  "retiro": "CABA",
  "puerto madero": "CABA",
  "villa del parque": "CABA",
  "villa pueyrredon": "CABA",
  "parque patricios": "CABA",
  "liniers": "CABA",
  "mataderos": "CABA",
  "villa lugano": "CABA",
  "villa soldati": "CABA",
  "pompeya": "CABA",
  "nueva pompeya": "CABA",
  "parque chacabuco": "CABA",
  "constitucion": "CABA",
  "balvanera": "CABA",
  "once": "CABA",
  "congreso": "CABA",
  "microcentro": "CABA",
  // Buenos Aires (GBA y ciudades del interior)
  "la plata": "Buenos Aires",
  "mar del plata": "Buenos Aires",
  "bahia blanca": "Buenos Aires",
  "quilmes": "Buenos Aires",
  "lomas de zamora": "Buenos Aires",
  "lanus": "Buenos Aires",
  "avellaneda": "Buenos Aires",
  "moron": "Buenos Aires",
  "san isidro": "Buenos Aires",
  "tigre": "Buenos Aires",
  "pilar": "Buenos Aires",
  "zarate": "Buenos Aires",
  "campana": "Buenos Aires",
  "junin": "Buenos Aires",
  "tandil": "Buenos Aires",
  "olavarria": "Buenos Aires",
  "necochea": "Buenos Aires",
  "pergamino": "Buenos Aires",
  "san nicolas": "Buenos Aires",
  "san miguel": "Buenos Aires",
  "san fernando": "Buenos Aires",
  "san martin": "Buenos Aires",
  "tres de febrero": "Buenos Aires",
  "vicente lopez": "Buenos Aires",
  "martinez": "Buenos Aires",
  "olivos": "Buenos Aires",
  "florida": "Buenos Aires",
  "temperley": "Buenos Aires",
  "banfield": "Buenos Aires",
  "ezeiza": "Buenos Aires",
  "merlo": "Buenos Aires",
  "moreno": "Buenos Aires",
  "ituzaingo": "Buenos Aires",
  "berazategui": "Buenos Aires",
  "florencio varela": "Buenos Aires",
  "almirante brown": "Buenos Aires",
  "escobar": "Buenos Aires",
  // Córdoba
  "cordoba": "Córdoba",
  "rio cuarto": "Córdoba",
  "villa maria": "Córdoba",
  "carlos paz": "Córdoba",
  "villa carlos paz": "Córdoba",
  "alta gracia": "Córdoba",
  // Santa Fe
  "rosario": "Santa Fe",
  "santa fe": "Santa Fe",
  "rafaela": "Santa Fe",
  "venado tuerto": "Santa Fe",
  "reconquista": "Santa Fe",
  // Mendoza
  "mendoza": "Mendoza",
  "san rafael": "Mendoza",
  "godoy cruz": "Mendoza",
  // Tucumán
  "tucuman": "Tucumán",
  "san miguel de tucuman": "Tucumán",
  // Salta
  "salta": "Salta",
  "oran": "Salta",
  "tartagal": "Salta",
  // Entre Ríos
  "parana": "Entre Ríos",
  "concordia": "Entre Ríos",
  "gualeguaychu": "Entre Ríos",
  // Misiones
  "posadas": "Misiones",
  "obera": "Misiones",
  "eldorado": "Misiones",
  // Corrientes
  "corrientes": "Corrientes",
  "goya": "Corrientes",
  // Chaco
  "resistencia": "Chaco",
  "presidencia roque saenz pena": "Chaco",
  "saenz pena": "Chaco",
  // San Juan
  "san juan": "San Juan",
  // San Luis
  "san luis": "San Luis",
  "villa mercedes": "San Luis",
  // Jujuy
  "jujuy": "Jujuy",
  "san salvador de jujuy": "Jujuy",
  // Río Negro
  "viedma": "Río Negro",
  "bariloche": "Río Negro",
  "san carlos de bariloche": "Río Negro",
  "cipolletti": "Río Negro",
  "general roca": "Río Negro",
  // Neuquén
  "neuquen": "Neuquén",
  // La Pampa
  "santa rosa": "La Pampa",
  // Catamarca
  "catamarca": "Catamarca",
  "san fernando del valle de catamarca": "Catamarca",
  // La Rioja
  "la rioja": "La Rioja",
  // Santiago del Estero
  "santiago del estero": "Santiago del Estero",
  // Formosa
  "formosa": "Formosa",
  // Chubut
  "rawson": "Chubut",
  "comodoro rivadavia": "Chubut",
  "trelew": "Chubut",
  "puerto madryn": "Chubut",
  // Santa Cruz
  "rio gallegos": "Santa Cruz",
  "caleta olivia": "Santa Cruz",
  "el calafate": "Santa Cruz",
  // Tierra del Fuego
  "ushuaia": "Tierra del Fuego",
  "rio grande": "Tierra del Fuego",
};

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/** Detect province from household city name. */
export function detectProvince(city: string | null | undefined): Province | null {
  if (!city) return null;
  const normalized = normalizeText(city);
  const match = CITY_TO_PROVINCE[normalized];
  if (match) return match;

  // Fallback: check if the city name contains a province name
  for (const [key, province] of Object.entries(CITY_TO_PROVINCE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return province;
    }
  }
  return null;
}

// ─── Service catalog ────────────────────────────────────────────────

export const ALL_PRESETS: ServicePreset[] = [
  // ── Electricidad (por provincia) ──
  { title: "Edenor", provider: "Edenor", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["CABA", "Buenos Aires"], section: "local" },
  { title: "Edesur", provider: "Edesur", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["CABA", "Buenos Aires"], section: "local" },
  { title: "EDELAP", provider: "EDELAP", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Buenos Aires"], section: "local" },
  { title: "EDEN", provider: "EDEN", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Buenos Aires"], section: "local" },
  { title: "EDEA", provider: "EDEA", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Buenos Aires"], section: "local" },
  { title: "EDES", provider: "EDES", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Buenos Aires"], section: "local" },
  { title: "EPEC", provider: "EPEC", category: "UTILITIES", frequency: "MONTHLY", provinces: ["Córdoba"], section: "local" },
  { title: "EPE", provider: "EPE", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Santa Fe"], section: "local" },
  { title: "EDEMSA", provider: "EDEMSA", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Mendoza"], section: "local" },
  { title: "EDET", provider: "EDET", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Tucumán"], section: "local" },
  { title: "EDESA", provider: "EDESA", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Salta"], section: "local" },
  { title: "ENERSA", provider: "ENERSA", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Entre Ríos"], section: "local" },
  { title: "EMSA", provider: "EMSA", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Misiones"], section: "local" },
  { title: "DPEC", provider: "DPEC", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Corrientes"], section: "local" },
  { title: "SECHEEP", provider: "SECHEEP", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Chaco"], section: "local" },
  { title: "Energía San Juan", provider: "Energía San Juan", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["San Juan"], section: "local" },
  { title: "EDESAL", provider: "EDESAL", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["San Luis"], section: "local" },
  { title: "EJE", provider: "EJE", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Jujuy"], section: "local" },
  { title: "EPEN", provider: "EPEN", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Neuquén"], section: "local" },
  { title: "EDERSA", provider: "EDERSA", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Río Negro"], section: "local" },
  { title: "APE", provider: "APE", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["La Pampa"], section: "local" },
  { title: "EC SAPEM", provider: "EC SAPEM", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Catamarca"], section: "local" },
  { title: "EDELAR", provider: "EDELAR", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["La Rioja"], section: "local" },
  { title: "EDESE", provider: "EDESE", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Santiago del Estero"], section: "local" },
  { title: "REFSA", provider: "REFSA", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Formosa"], section: "local" },
  { title: "SPSE", provider: "SPSE", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Santa Cruz"], section: "local" },
  { title: "DPE TDF", provider: "DPE TDF", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Tierra del Fuego"], section: "local" },

  // ── Gas (por zona) ──
  { title: "MetroGas", provider: "MetroGas", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["CABA", "Buenos Aires"], section: "local" },
  { title: "Naturgy", provider: "Naturgy BAN", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Buenos Aires"], section: "local" },
  { title: "Camuzzi Gas Pampeana", provider: "Camuzzi", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Buenos Aires", "La Pampa"], section: "local" },
  { title: "Camuzzi Gas del Sur", provider: "Camuzzi", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Neuquén", "Río Negro", "Chubut", "Santa Cruz", "Tierra del Fuego"], section: "local" },
  { title: "Litoral Gas", provider: "Litoral Gas", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Santa Fe", "Buenos Aires"], section: "local" },
  { title: "Ecogas", provider: "Ecogas", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Córdoba", "Catamarca", "La Rioja", "Mendoza", "San Juan", "San Luis"], section: "local" },
  { title: "Gasnor", provider: "Gasnor", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Tucumán", "Salta", "Jujuy", "Santiago del Estero"], section: "local" },
  { title: "Gasnea", provider: "Gasnea", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Entre Ríos", "Corrientes", "Misiones", "Chaco", "Formosa"], section: "local" },

  // ── Agua (por provincia) ──
  { title: "AySA", provider: "AySA", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["CABA", "Buenos Aires"], section: "local" },
  { title: "ABSA", provider: "ABSA", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Buenos Aires"], section: "local" },
  { title: "Aguas Cordobesas", provider: "Aguas Cordobesas", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Córdoba"], section: "local" },
  { title: "Aguas Santafesinas", provider: "ASSA", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Santa Fe"], section: "local" },
  { title: "AYSAM", provider: "AYSAM", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Mendoza"], section: "local" },
  { title: "SAT", provider: "SAT", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Tucumán"], section: "local" },
  { title: "Aguas del Norte", provider: "Aguas del Norte", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Salta"], section: "local" },
  { title: "SAMEEP", provider: "SAMEEP", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Chaco"], section: "local" },
  { title: "Aguas de Corrientes", provider: "Aguas de Corrientes", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["Corrientes"], section: "local" },
  { title: "OSSE San Juan", provider: "OSSE", category: "UTILITIES", frequency: "BIMONTHLY", provinces: ["San Juan"], section: "local" },

  // ── Telecom (nacional) ──
  { title: "Personal", provider: "Telecom", category: "UTILITIES", frequency: "MONTHLY", provinces: [], section: "telecom" },
  { title: "Claro", provider: "Claro", category: "UTILITIES", frequency: "MONTHLY", provinces: [], section: "telecom" },
  { title: "Movistar", provider: "Movistar", category: "UTILITIES", frequency: "MONTHLY", provinces: [], section: "telecom" },
  { title: "Fibertel", provider: "Telecom", category: "UTILITIES", frequency: "MONTHLY", provinces: [], section: "telecom" },
  { title: "Flow", provider: "Telecom", category: "UTILITIES", frequency: "MONTHLY", provinces: [], section: "telecom" },
  { title: "Telecentro", provider: "Telecentro", category: "UTILITIES", frequency: "MONTHLY", provinces: ["CABA", "Buenos Aires"], section: "telecom" },
  { title: "DirecTV", provider: "DirecTV", category: "UTILITIES", frequency: "MONTHLY", provinces: [], section: "telecom" },

  // ── Streaming (nacional) ──
  { title: "Netflix", provider: "Netflix", category: "ENTERTAINMENT", frequency: "MONTHLY", provinces: [], section: "streaming" },
  { title: "Spotify", provider: "Spotify", category: "ENTERTAINMENT", frequency: "MONTHLY", provinces: [], section: "streaming" },
  { title: "Disney+", provider: "Disney+", category: "ENTERTAINMENT", frequency: "MONTHLY", provinces: [], section: "streaming" },
  { title: "Max", provider: "Max", category: "ENTERTAINMENT", frequency: "MONTHLY", provinces: [], section: "streaming" },
  { title: "YouTube Premium", provider: "YouTube", category: "ENTERTAINMENT", frequency: "MONTHLY", provinces: [], section: "streaming" },
  { title: "Amazon Prime", provider: "Amazon", category: "ENTERTAINMENT", frequency: "MONTHLY", provinces: [], section: "streaming" },
  { title: "Paramount+", provider: "Paramount+", category: "ENTERTAINMENT", frequency: "MONTHLY", provinces: [], section: "streaming" },
  { title: "Crunchyroll", provider: "Crunchyroll", category: "ENTERTAINMENT", frequency: "MONTHLY", provinces: [], section: "streaming" },

  // ── Impuestos (nacional / algunos provinciales) ──
  { title: "Monotributo", category: "OTHER", frequency: "MONTHLY", provinces: [], section: "impuestos" },
  { title: "Ingresos Brutos", category: "OTHER", frequency: "MONTHLY", provinces: [], section: "impuestos" },
  { title: "ABL", category: "OTHER", frequency: "BIMONTHLY", provinces: ["CABA"], section: "impuestos" },
  { title: "ARBA", provider: "ARBA", category: "OTHER", frequency: "BIMONTHLY", provinces: ["Buenos Aires"], section: "impuestos" },
  { title: "Inmobiliario", category: "OTHER", frequency: "BIMONTHLY", provinces: [], section: "impuestos" },
  { title: "Patente", category: "TRANSPORT", frequency: "BIMONTHLY", provinces: [], section: "impuestos" },

  // ── Hogar (nacional) ──
  { title: "Alquiler", category: "RENT", frequency: "MONTHLY", provinces: [], section: "hogar" },
  { title: "Expensas", category: "RENT", frequency: "MONTHLY", provinces: [], section: "hogar" },
  { title: "Seguro hogar", category: "HOME", frequency: "MONTHLY", provinces: [], section: "hogar" },

  // ── Salud (nacional) ──
  { title: "Prepaga", category: "HEALTH", frequency: "MONTHLY", provinces: [], section: "salud" },
  { title: "OSDE", provider: "OSDE", category: "HEALTH", frequency: "MONTHLY", provinces: [], section: "salud" },
  { title: "Swiss Medical", provider: "Swiss Medical", category: "HEALTH", frequency: "MONTHLY", provinces: [], section: "salud" },
  { title: "Galeno", provider: "Galeno", category: "HEALTH", frequency: "MONTHLY", provinces: [], section: "salud" },

  // ── Transporte (nacional) ──
  { title: "Seguro auto", category: "TRANSPORT", frequency: "MONTHLY", provinces: [], section: "transporte" },
  { title: "Cochera", category: "TRANSPORT", frequency: "MONTHLY", provinces: [], section: "transporte" },

  // ── Educación (nacional) ──
  { title: "Cuota colegio", category: "EDUCATION", frequency: "MONTHLY", provinces: [], section: "hogar" },
  { title: "Cuota jardín", category: "EDUCATION", frequency: "MONTHLY", provinces: [], section: "hogar" },
];

// ─── Section labels ─────────────────────────────────────────────────

const SECTION_LABELS: Record<ServiceSection, string> = {
  local: "Tu zona",
  telecom: "Comunicación",
  streaming: "Streaming",
  impuestos: "Impuestos",
  hogar: "Hogar",
  salud: "Salud",
  transporte: "Transporte",
  otros: "Otros",
};

export const SECTION_ORDER: ServiceSection[] = [
  "local", "telecom", "streaming", "hogar", "impuestos", "salud", "transporte", "otros",
];

/** Section labels for Gmail scan results display */
export const SCAN_SECTION_LABELS: Record<ServiceSection, string> = {
  local: "Servicios públicos",
  telecom: "Comunicación",
  streaming: "Suscripciones",
  impuestos: "Impuestos",
  hogar: "Hogar",
  salud: "Salud",
  transporte: "Transporte",
  otros: "Otros servicios detectados",
};

export interface ServicePresetGroup {
  label: string;
  presets: ServicePreset[];
}

/**
 * Get service presets grouped by section, filtered by household location.
 * Local services only show for the matching province; national services always show.
 */
export function getSuggestedServices(householdCity: string | null): ServicePresetGroup[] {
  const province = detectProvince(householdCity);

  const filtered = ALL_PRESETS.filter((preset) => {
    // National services always show
    if (preset.provinces.length === 0) return true;
    // No province detected → hide local section (too many); user can search instead
    if (!province) return false;
    // Province detected → only matching local services
    return preset.provinces.includes(province);
  });

  const groups: ServicePresetGroup[] = [];

  for (const section of SECTION_ORDER) {
    const presets = filtered.filter((p) => p.section === section);
    if (presets.length > 0) {
      const label = section === "local" && province
        ? `Tu zona (${province})`
        : SECTION_LABELS[section];
      groups.push({ label, presets });
    }
  }

  return groups;
}

/**
 * Search presets by query string. Matches against title and provider.
 */
export function searchServices(query: string, householdCity: string | null): ServicePreset[] {
  const normalized = normalizeText(query);
  if (normalized.length < 2) return [];

  const province = detectProvince(householdCity);

  return ALL_PRESETS.filter((preset) => {
    // Province filter: skip local services for OTHER provinces (not user's)
    if (preset.provinces.length > 0 && province && !preset.provinces.includes(province)) {
      return false;
    }
    // No province? Allow all — user can pick manually

    const titleMatch = normalizeText(preset.title).includes(normalized);
    const providerMatch = preset.provider ? normalizeText(preset.provider).includes(normalized) : false;
    return titleMatch || providerMatch;
  });
}
