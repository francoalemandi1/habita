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
      // Cadenas y formatos
      "supermercado", "super", "coto", "carrefour", "jumbo", "dia", "disco",
      "changomas", "vea", "walmart", "chino", "almacen", "verduleria",
      "fiambreria", "carniceria", "despensa",
      "kiosco", "maxikiosco", "minimarket", "autoservicio", "dietetica",
      "mercado", "mayorista", "diarco", "makro", "vital",
      "granja", "huevos", "frutas", "verduras", "bebidas",
      // Productos y conceptos de compra diaria
      "compras", "mandado", "mandados", "leche", "pan", "yerba", "mate",
      "limpieza hogar", "articulos limpieza", "lavandina", "detergente",
      "papel higienico", "panales", "perfumeria",
    ],
  },
  {
    category: "UTILITIES",
    keywords: [
      // Servicios publicos
      "luz", "gas", "agua", "internet", "wifi", "telefono", "celular",
      "cable", "electricidad", "edenor", "edesur", "metrogas", "telecom",
      "personal", "claro", "movistar", "fibertel", "absa", "aysa",
      "servicio", "servicios", "expensas",
      // Impuestos y seguros
      "monotributo", "impuesto", "municipal", "arba", "afip",
      "abl", "inmobiliario", "seguro hogar", "iibb",
      "tuenti", "flow", "directv", "starlink",
      // Suscripciones de servicios digitales que no son entretenimiento
      "icloud", "google one", "dropbox", "chatgpt", "openai",
      "apple", "microsoft 365", "office",
      "seguro", "prepaga",
    ],
  },
  {
    category: "RENT",
    keywords: ["alquiler", "renta", "inmobiliaria", "deposito alquiler", "garantia"],
  },
  {
    category: "FOOD",
    keywords: [
      // Restaurantes y bares
      "restaurante", "restaurant", "comida", "delivery", "rappi", "pedidosya",
      "pedidos ya", "mcdonalds", "burger", "pizza", "sushi", "cafe",
      "bar", "cerveceria", "heladeria", "panaderia", "rotiseria",
      "empanadas", "milanesas", "asado",
      "cafeteria", "cerveza", "vino", "birra", "hamburgueseria",
      "lomiteria", "bodegon", "parrilla", "tenedor libre",
      "brunch", "merienda", "almuerzo", "cena", "desayuno", "morfi",
      "pedir comida", "ifood", "globo", "didi food",
      // Cadenas conocidas
      "starbucks", "havanna", "mostaza", "wendys", "subway",
      "grido", "freddo", "persicco", "helado",
      "facturas", "medialunas", "tostado", "sandwich",
      // Salidas y eventos con comida
      "picada", "juntada", "previa", "after", "salida",
      "birra", "fernet", "trago", "tragos", "happy hour",
    ],
  },
  {
    category: "TRANSPORT",
    keywords: [
      // Viajes y movilidad
      "uber", "cabify", "taxi", "remis", "nafta", "combustible", "peaje",
      "estacionamiento", "sube", "colectivo", "tren", "subte", "ypf",
      "shell", "axion", "gnc", "parking", "cochera",
      "didi", "beat", "fletero", "mudanza", "patente",
      "vtv", "seguro auto", "mecanico", "taller", "gomeria",
      "puma energy", "gasoil", "verificacion tecnica",
      // Viajes
      "vuelo", "avion", "aerolinea", "aeropuerto", "micro",
      "flybondi", "jetsmart", "aerolineas", "buquebus",
      "hotel", "hostel", "airbnb", "booking", "alojamiento",
      "viaje", "vacaciones", "excursion", "pasaje", "pasajes",
    ],
  },
  {
    category: "HEALTH",
    keywords: [
      // Salud y bienestar
      "farmacia", "medico", "doctor", "hospital", "clinica", "salud",
      "remedio", "medicamento", "obra social", "prepaga", "osde",
      "swiss medical", "galeno", "dentista", "oculista", "analisis",
      "farmacity", "farmaplus", "farmacia del pueblo",
      "turno medico", "consulta", "operacion", "cirugia",
      "lentes", "optica", "psicologo", "terapia",
      "kinesiologo", "nutricionista", "veterinaria", "veterinario",
      "odontologia", "traumatologo", "dermatologo",
      // Bienestar y cuidado personal
      "peluqueria", "barberia", "spa", "masaje", "estetica",
      "crema", "shampoo", "perfume", "cosmetico",
    ],
  },
  {
    category: "ENTERTAINMENT",
    keywords: [
      // Salidas y espectaculos
      "cine", "teatro", "recital", "show", "entrada", "entradas",
      "escape room", "bowling", "karaoke", "boliche", "fiesta",
      "cumpleanos", "evento", "festival", "parque", "zoo", "museo",
      "pileta", "club", "cancha", "paddle", "futbol", "gym", "gimnasio",
      // Suscripciones de entretenimiento
      "netflix", "spotify", "disney", "hbo", "amazon", "youtube",
      "streaming", "juego", "juegos", "play", "steam",
      "xbox", "playstation", "nintendo", "twitch", "prime video",
      "max", "paramount", "crunchyroll", "star+",
      // Compras de ocio
      "ropa", "zapatillas", "zarpa", "nike", "adidas", "zara",
      "shopping", "indumentaria", "remera", "pantalon", "campera",
      "regalo", "regalos", "juguete", "juguetes",
      "mascota", "perro", "gato", "veterinario", "alimento mascota",
      "petshop", "puppis",
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
      "ingles", "idioma", "idiomas", "instituto", "capacitacion",
    ],
  },
  {
    category: "HOME",
    keywords: [
      // Mantenimiento y reparaciones
      "ferreteria", "pintura", "plomero", "electricista", "limpieza",
      "mueble", "muebles", "arreglo", "reparacion", "decoracion",
      "jardin", "easy", "sodimac",
      "gasista", "cerrajero", "vidriero", "vidrieria",
      "cortina", "colchon", "electrodomestico",
      "whirlpool", "samsung", "philips", "ikea",
      "fumigacion", "mudanza casa", "pintureria",
      // Tecnologia y electronica para el hogar
      "computadora", "notebook", "celular nuevo", "tablet",
      "impresora", "router", "smart tv", "heladera", "lavarropas",
      "microondas", "horno", "aspiradora", "ventilador", "aire acondicionado",
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
