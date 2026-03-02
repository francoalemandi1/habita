export type ExpenseCategory =
  | "GROCERIES"
  | "UTILITIES"
  | "RENT"
  | "FOOD"
  | "TRANSPORT"
  | "HEALTH"
  | "ENTERTAINMENT"
  | "EDUCATION"
  | "HOME"
  | "OTHER";

export type ExpenseSubcategory =
  | "GENERAL"
  | "SUPERMARKET"
  | "KIOSCO"
  | "DELIVERY"
  | "RESTAURANT"
  | "STREAMING"
  | "PHARMACY"
  | "FUEL"
  | "TRANSPORT_APP";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

const DELIVERY_KEYWORDS = ["rappi", "pedidosya", "pedidos ya", "peya", "delivery", "ifood", "didi food", "glovo"];
const KIOSCO_KEYWORDS = ["kiosco", "kiosko", "maxikiosco", "minimarket", "drugstore"];
const SUPERMARKET_KEYWORDS = ["supermercado", "super ", "super", "coto", "carrefour", "jumbo", "dia", "disco", "vea", "changomas", "makro", "diarco", "vital"];
const RESTAURANT_KEYWORDS = ["restaurante", "restaurant", "bar", "cerveceria", "parrilla", "bodegon", "cafeteria", "heladeria"];
const STREAMING_KEYWORDS = ["netflix", "spotify", "hbo", "max", "disney", "prime video", "youtube premium"];
const PHARMACY_KEYWORDS = ["farmacia", "farmacity", "farmaplus", "medicamento", "remedio"];
const FUEL_KEYWORDS = ["nafta", "combustible", "gasoil", "ypf", "shell", "axion", "puma energy", "gnc"];
const TRANSPORT_APP_KEYWORDS = ["uber", "cabify", "didi", "taxi", "remis"];

function fallbackByCategory(category: ExpenseCategory): ExpenseSubcategory {
  if (category === "GROCERIES") return "SUPERMARKET";
  return "GENERAL";
}

export function inferExpenseSubcategory(title: string, category: ExpenseCategory): ExpenseSubcategory {
  const normalized = normalize(title);
  if (!normalized) return fallbackByCategory(category);

  if (hasAny(normalized, DELIVERY_KEYWORDS)) return "DELIVERY";
  if (hasAny(normalized, KIOSCO_KEYWORDS)) return "KIOSCO";
  if (hasAny(normalized, STREAMING_KEYWORDS)) return "STREAMING";
  if (hasAny(normalized, PHARMACY_KEYWORDS)) return "PHARMACY";
  if (hasAny(normalized, FUEL_KEYWORDS)) return "FUEL";
  if (hasAny(normalized, TRANSPORT_APP_KEYWORDS)) return "TRANSPORT_APP";
  if (hasAny(normalized, SUPERMARKET_KEYWORDS)) return "SUPERMARKET";
  if (hasAny(normalized, RESTAURANT_KEYWORDS)) return "RESTAURANT";

  return fallbackByCategory(category);
}
