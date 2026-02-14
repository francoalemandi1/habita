import {
  ShoppingCart,
  Zap,
  Home,
  UtensilsCrossed,
  Car,
  HeartPulse,
  Clapperboard,
  GraduationCap,
  Wrench,
  MoreHorizontal,
} from "lucide-react";

import type { ExpenseCategory } from "@prisma/client";
import type { LucideIcon } from "lucide-react";

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  GROCERIES: "Supermercado",
  UTILITIES: "Servicios",
  RENT: "Alquiler",
  FOOD: "Comida",
  TRANSPORT: "Transporte",
  HEALTH: "Salud",
  ENTERTAINMENT: "Entretenimiento",
  EDUCATION: "Educación",
  HOME: "Hogar",
  OTHER: "Otros",
};

export const CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  GROCERIES: ShoppingCart,
  UTILITIES: Zap,
  RENT: Home,
  FOOD: UtensilsCrossed,
  TRANSPORT: Car,
  HEALTH: HeartPulse,
  ENTERTAINMENT: Clapperboard,
  EDUCATION: GraduationCap,
  HOME: Wrench,
  OTHER: MoreHorizontal,
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  GROCERIES: "bg-green-100 text-green-600",
  UTILITIES: "bg-yellow-100 text-yellow-600",
  RENT: "bg-blue-100 text-blue-600",
  FOOD: "bg-orange-100 text-orange-600",
  TRANSPORT: "bg-sky-100 text-sky-600",
  HEALTH: "bg-red-100 text-red-600",
  ENTERTAINMENT: "bg-purple-100 text-purple-600",
  EDUCATION: "bg-indigo-100 text-indigo-600",
  HOME: "bg-stone-100 text-stone-600",
  OTHER: "bg-gray-100 text-gray-600",
};

export const CATEGORY_OPTIONS: Array<{ value: ExpenseCategory; label: string }> =
  Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value: value as ExpenseCategory,
    label,
  }));

/** Strip diacritics so "farmacía" matches "farmacia". */
function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/** Short keywords (≤3 chars) that must match as whole words to avoid false positives. */
const SHORT_KEYWORD_MAX_LENGTH = 3;

/** Keywords that trigger auto-categorization from expense title. */
const CATEGORY_KEYWORDS: Array<{ category: ExpenseCategory; keywords: string[] }> = [
  {
    category: "GROCERIES",
    keywords: [
      "supermercado", "super", "coto", "carrefour", "jumbo", "dia", "disco",
      "changomas", "vea", "walmart", "chino", "almacen", "verduleria",
      "fiambreria", "carniceria", "despensa",
      "kiosco", "maxikiosco", "minimarket", "autoservicio", "dietetica",
      "mercado", "mayorista", "diarco", "makro", "vital",
      "granja", "huevos", "frutas", "verduras", "bebidas",
    ],
  },
  {
    category: "UTILITIES",
    keywords: [
      "luz", "gas", "agua", "internet", "wifi", "telefono", "celular",
      "cable", "electricidad", "edenor", "edesur", "metrogas", "telecom",
      "personal", "claro", "movistar", "fibertel", "absa", "aysa",
      "servicio", "servicios", "expensas",
      "monotributo", "impuesto", "municipal", "arba", "afip",
      "abl", "inmobiliario", "seguro hogar", "iibb",
      "tuenti", "flow", "directv", "starlink",
    ],
  },
  {
    category: "RENT",
    keywords: ["alquiler", "renta", "inmobiliaria", "deposito alquiler", "garantia"],
  },
  {
    category: "FOOD",
    keywords: [
      "restaurante", "restaurant", "comida", "delivery", "rappi", "pedidosya",
      "pedidos ya", "mcdonalds", "burger", "pizza", "sushi", "cafe",
      "bar", "cerveceria", "heladeria", "panaderia", "rotiseria",
      "empanadas", "milanesas", "asado",
      "cafeteria", "cerveza", "vino", "birra", "hamburgueseria",
      "lomiteria", "bodegon", "parrilla", "tenedor libre",
      "brunch", "merienda", "almuerzo", "cena", "desayuno", "morfi",
      "pedir comida", "ifood", "globo", "didi food",
      "starbucks", "havanna", "mostaza", "wendys", "subway",
      "grido", "freddo", "persicco", "helado",
      "facturas", "medialunas", "tostado", "sandwich",
    ],
  },
  {
    category: "TRANSPORT",
    keywords: [
      "uber", "cabify", "taxi", "remis", "nafta", "combustible", "peaje",
      "estacionamiento", "sube", "colectivo", "tren", "subte", "ypf",
      "shell", "axion", "gnc", "parking", "cochera",
      "didi", "beat", "fletero", "mudanza", "patente",
      "vtv", "seguro auto", "mecanico", "taller", "gomeria",
      "puma energy", "gasoil", "verificacion tecnica",
    ],
  },
  {
    category: "HEALTH",
    keywords: [
      "farmacia", "medico", "doctor", "hospital", "clinica", "salud",
      "remedio", "medicamento", "obra social", "prepaga", "osde",
      "swiss medical", "galeno", "dentista", "oculista", "analisis",
      "farmacity", "farmaplus", "farmacia del pueblo",
      "turno medico", "consulta", "operacion", "cirugia",
      "lentes", "optica", "psicologo", "terapia",
      "kinesiologo", "nutricionista", "veterinaria", "veterinario",
      "odontologia", "traumatologo", "dermatologo",
    ],
  },
  {
    category: "ENTERTAINMENT",
    keywords: [
      "cine", "teatro", "recital", "show", "entrada", "entradas",
      "netflix", "spotify", "disney", "hbo", "amazon", "youtube",
      "streaming", "juego", "juegos", "play", "steam",
      "escape room", "bowling", "karaoke", "boliche", "fiesta",
      "cumpleanos", "evento", "festival", "parque", "zoo", "museo",
      "pileta", "club", "cancha", "paddle", "futbol", "gym", "gimnasio",
      "xbox", "playstation", "nintendo", "twitch", "prime video",
      "max", "paramount", "crunchyroll", "star+",
    ],
  },
  {
    category: "EDUCATION",
    keywords: [
      "colegio", "escuela", "universidad", "facultad", "curso",
      "clase", "cuota", "materia", "libro", "libreria", "academia",
      "guarderia", "jardin", "materiales", "utiles", "cuaderno",
      "seminario", "certificacion", "diploma", "maestria",
      "udemy", "coursera", "platzi", "domestika",
    ],
  },
  {
    category: "HOME",
    keywords: [
      "ferreteria", "pintura", "plomero", "electricista", "limpieza",
      "mueble", "muebles", "arreglo", "reparacion", "decoracion",
      "jardin", "easy", "sodimac",
      "gasista", "cerrajero", "vidriero", "vidrieria",
      "cortina", "colchon", "electrodomestico",
      "whirlpool", "samsung", "philips", "ikea",
      "fumigacion", "mudanza casa", "pintureria",
    ],
  },
];

/**
 * Infer expense category from title using keyword matching.
 * Uses accent normalization and word-boundary matching for short keywords.
 * Returns null if no match is found (keeps current category unchanged).
 */
export function inferCategory(title: string): ExpenseCategory | null {
  const normalized = normalizeText(title);
  if (normalized.length < 2) return null;

  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      const normalizedKeyword = normalizeText(keyword);

      if (normalizedKeyword.length <= SHORT_KEYWORD_MAX_LENGTH) {
        // Short keywords: match as whole word to avoid false positives
        // "dia" should match "dia" or "dia%" but not "mediador"
        const wordBoundary = new RegExp(`\\b${normalizedKeyword}\\b`);
        if (wordBoundary.test(normalized)) {
          return category;
        }
      } else {
        if (normalized.includes(normalizedKeyword)) {
          return category;
        }
      }
    }
  }

  return null;
}
