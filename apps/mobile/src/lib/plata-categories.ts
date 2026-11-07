/**
 * Expense category/subcategory icons + labels shared by the Gastos list and
 * the expense detail screen (handoff §5.3 "Plata").
 */
import {
  Bike,
  Car,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  Home,
  MoreHorizontal,
  Receipt,
  ShoppingCart,
  Store,
  UtensilsCrossed,
  Wrench,
  Zap,
} from "lucide-react-native";
import { categoryColorFallback, categoryColors } from "@/theme";

import type { LucideIcon } from "lucide-react-native";
import type { ExpenseCategory } from "@habita/contracts";

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

export const SUBCATEGORY_ICON_OVERRIDES: Record<string, LucideIcon> = {
  DELIVERY: Bike,
  KIOSCO: Store,
  SUPERMARKET: ShoppingCart,
};

/** Falls back to the category icon, then to a generic receipt. */
export function resolveExpenseIcon(category: ExpenseCategory, subcategory: string): LucideIcon {
  return SUBCATEGORY_ICON_OVERRIDES[subcategory] ?? CATEGORY_ICONS[category] ?? Receipt;
}

export function getCategoryColor(category: ExpenseCategory): { bg: string; text: string } {
  return categoryColors[category] ?? categoryColorFallback;
}
