/**
 * Habita Domain Classifier
 *
 * Deterministic, 3-layer classifier for filtering and categorizing products
 * within the Habita household consumption domain.
 *
 * Architecture:
 *   Layer 1 → HARD_EXCLUDE: reject non-household products (electronics, furniture, etc.)
 *   Layer 2 → CATEGORY_CLUSTERS: match product to a Habita category via keywords
 *   Layer 3 → Consumption signal: detect unit patterns (kg, ml, x6) as fallback → "comida"
 *
 * No LLM calls. Purely deterministic string matching.
 */

// ============================================
// Domain model
// ============================================

export const HABITA_CATEGORIES = [
  "comida",
  "bebidas",
  "limpieza",
  "higiene",
  "mascotas",
  "farmacia",
] as const;

export type HabitaCategory = (typeof HABITA_CATEGORIES)[number];

/** Display labels for each category (Spanish) */
export const CATEGORY_LABELS: Record<HabitaCategory, string> = {
  comida: "Comida",
  bebidas: "Bebidas",
  limpieza: "Limpieza",
  higiene: "Higiene",
  mascotas: "Mascotas",
  farmacia: "Farmacia",
};

// ============================================
// Layer 1: Hard exclusions
// ============================================

/** Products matching any of these keywords are outside Habita's domain entirely */
const HARD_EXCLUDE = [
  // Electronics & tech
  "televisor", "tv ", "smart tv", "notebook", "laptop", "celular", "smartphone",
  "tablet", "auricular", "parlante", "consola", "playstation", "xbox", "monitor",
  "impresora", "pendrive", "disco duro", "ssd", "router", "cargador",
  // Appliances
  "lavarropas", "heladera", "freezer", "microondas", "horno eléctrico",
  "aire acondicionado", "ventilador", "aspiradora", "licuadora", "cafetera",
  "tostadora", "plancha de ropa", "secarropas",
  // Furniture & home
  "sillón", "sillon", "sofá", "sofa", "mesa ", "escritorio", "cama ",
  "colchón", "colchon", "ropero", "placard", "estantería", "estanteria",
  // Tools & hardware
  "taladro", "destornillador", "sierra", "amoladora", "compresor",
  // Vehicles
  "neumático", "neumatico", "aceite motor", "batería auto", "bateria auto",
  // Clothing
  "zapatilla", "remera", "pantalón", "pantalon", "campera", "jean ",
  // Services & intangibles
  "seguro ", "suscripción", "suscripcion", "membresía", "membresia",
];

// ============================================
// Layer 2: Category keyword clusters
// ============================================

/**
 * Each cluster maps a set of representative keywords to a Habita category.
 * Keywords are checked against the lowercased product name + detail.
 * Order matters: first match wins.
 */
const CATEGORY_CLUSTERS: { category: HabitaCategory; keywords: string[] }[] = [
  {
    category: "bebidas",
    keywords: [
      "gaseosa", "coca cola", "pepsi", "sprite", "fanta", "7up", "seven up",
      "agua mineral", "soda", "jugo", "cerveza", "vino ", "fernet",
      "aperitivo", "whisky", "vodka", "gin ", "ron ", "champagne",
      "energizante", "speed", "red bull", "powerade", "gatorade",
      "mate cocido", "café ", "cafe ", "té ", "te ", "leche chocolatada",
    ],
  },
  {
    category: "limpieza",
    keywords: [
      "detergente", "lavandina", "desinfectante", "limpiador", "limpiavidrios",
      "esponja", "trapo", "balde", "escoba", "lampazo", "secador piso",
      "jabón líquido ropa", "jabon liquido ropa", "suavizante", "quitamanchas",
      "lustramuebles", "cera piso", "bolsa residuo", "bolsa basura",
      "insecticida", "repelente cucaracha", "desodorante ambiente",
      "papel aluminio", "film", "rollo cocina",
    ],
  },
  {
    category: "higiene",
    keywords: [
      "shampoo", "champú", "champu", "acondicionador", "jabón tocador",
      "jabon tocador", "gel de ducha", "crema enjuague",
      "desodorante", "antitranspirante", "pasta dental", "cepillo dental",
      "hilo dental", "enjuague bucal", "protector solar",
      "papel higiénico", "papel higienico", "pañuelo descartable",
      "toalla femenina", "tampón", "tampon", "protector diario",
      "pañal", "panal", "toallita húmeda", "toallita humeda",
      "algodón", "algodon", "afeitadora", "crema afeitar",
    ],
  },
  {
    category: "mascotas",
    keywords: [
      "alimento perro", "alimento gato", "comida perro", "comida gato",
      "dog chow", "cat chow", "whiskas", "pedigree", "royal canin",
      "purina", "excellent", "old prince", "pro plan",
      "arena gato", "piedra sanitaria", "antipulga", "garrapata mascota",
      "snack perro", "snack gato", "hueso perro",
    ],
  },
  {
    category: "farmacia",
    keywords: [
      "ibuprofeno", "paracetamol", "aspirina", "amoxicilina", "antibiótico",
      "antibiotico", "analgésico", "analgesico", "antiinflamatorio",
      "antigripal", "jarabe", "vitamina", "suplemento", "omeprazol",
      "curitas", "gasa", "venda", "termómetro", "termometro",
      "alcohol ", "agua oxigenada", "pervinox",
      "preservativo", "anticonceptivo", "test embarazo",
      "lente contacto", "solución lentes",
    ],
  },
  {
    category: "comida",
    keywords: [
      // Dairy
      "leche ", "yogur", "queso", "manteca", "crema de leche", "ricota", "dulce de leche",
      // Meat
      "carne", "asado", "bife", "costilla", "nalga", "peceto", "vacío", "vacio",
      "pollo", "pechuga", "muslo", "milanesa", "hamburguesa",
      "cerdo", "bondiola", "chorizo", "salchicha", "jamón", "jamon",
      "mortadela", "salame", "fiambre", "panceta",
      // Fish
      "merluza", "atún", "atun", "salmón", "salmon", "surimi",
      // Bakery & grains
      "pan ", "pan lactal", "galletita", "galleta", "tostada",
      "harina", "arroz", "fideos", "pasta ", "tallarín", "tallarin",
      "polenta", "avena", "cereal ",
      // Oils & condiments
      "aceite ", "vinagre", "sal ", "azúcar", "azucar", "pimienta",
      "mayonesa", "ketchup", "mostaza", "salsa ", "chimichurri",
      // Canned & preserved
      "conserva", "arvejas", "choclo", "tomate perita", "puré tomate", "pure tomate",
      "duraznos en", "mermelada", "miel ",
      // Frozen
      "helado", "empanada", "pizza congelada", "nugget",
      // Snacks
      "papa frita", "snack ", "alfajor", "chocolate", "golosina", "caramelo",
      // Fruits & vegetables
      "banana", "manzana", "naranja", "papa ", "tomate", "cebolla",
      "lechuga", "zanahoria", "palta", "limón", "limon",
    ],
  },
];

// ============================================
// Layer 3: Consumption signal patterns
// ============================================

/** Regex patterns that indicate a product is consumable (has weight/volume/unit count) */
const CONSUMPTION_PATTERNS = [
  /\b\d+\s*(kg|kgs|g|gr|grs|mg)\b/i,
  /\b\d+\s*(ml|l|lt|lts|cc)\b/i,
  /\bx\s*\d+\b/i,                      // x2, x6, x12
  /\b\d+\s*un\b/i,                      // 20 un, 10un
  /\b\d+\s*(pack|paq)\b/i,             // 6 pack, paq 500
];

// ============================================
// Classifier
// ============================================

/**
 * Classify a product into a Habita category.
 *
 * @returns The category name, or null if the product is outside Habita's domain.
 *
 * Pipeline:
 *   1. HARD_EXCLUDE match → null (reject)
 *   2. CATEGORY_CLUSTERS match → category
 *   3. Consumption signal (kg, ml, x6) → "comida" (fallback for unrecognized food)
 *   4. No match → null (reject)
 */
export function classifyHabita(
  productName: string,
  detail?: string,
): HabitaCategory | null {
  const combined = `${productName} ${detail ?? ""}`.toLowerCase();

  // Layer 1: hard exclusion
  if (HARD_EXCLUDE.some((keyword) => combined.includes(keyword))) {
    return null;
  }

  // Layer 2: category cluster match
  for (const cluster of CATEGORY_CLUSTERS) {
    if (cluster.keywords.some((keyword) => combined.includes(keyword))) {
      return cluster.category;
    }
  }

  // Layer 3: structural consumption signal → default to "comida"
  if (hasConsumptionSignal(combined)) {
    return "comida";
  }

  // No match — outside Habita domain
  return null;
}

/** Check if text contains structural patterns typical of consumable products. */
function hasConsumptionSignal(text: string): boolean {
  return CONSUMPTION_PATTERNS.some((pattern) => pattern.test(text));
}

// ============================================
// Category diversifier
// ============================================

/**
 * Limit deals per category for broad searches to ensure variety.
 * Keeps at most `maxPerCategory` deals from each category.
 *
 * For specific searches (user typed a product name), this should be skipped
 * because the user explicitly wants results in that category.
 */
export function diversifyByCategory<T extends { category: HabitaCategory }>(
  deals: T[],
  maxPerCategory: number = 2,
): T[] {
  const categoryCounts = new Map<HabitaCategory, number>();

  return deals.filter((deal) => {
    const count = categoryCounts.get(deal.category) ?? 0;
    if (count >= maxPerCategory) return false;
    categoryCounts.set(deal.category, count + 1);
    return true;
  });
}
