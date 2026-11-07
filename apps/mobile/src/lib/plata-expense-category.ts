/**
 * `SerializedService.category` is a plain `string` in `@habita/contracts`
 * (no Prisma enum on this side). This guard replaces unvalidated
 * `as ExpenseCategory` casts with a real membership check.
 *
 * Kept free of React Native / theme imports (unlike `plata-categories.ts`)
 * so it can be unit tested directly with the shared root vitest config.
 */
import type { ExpenseCategory } from "@habita/contracts";

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  "GROCERIES",
  "UTILITIES",
  "RENT",
  "FOOD",
  "TRANSPORT",
  "HEALTH",
  "ENTERTAINMENT",
  "EDUCATION",
  "HOME",
  "OTHER",
];

const EXPENSE_CATEGORY_SET = new Set<string>(EXPENSE_CATEGORIES);

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return EXPENSE_CATEGORY_SET.has(value);
}

/** Narrows a loosely-typed category string, falling back when it isn't a known category. */
export function toExpenseCategory(value: string | null | undefined, fallback: ExpenseCategory): ExpenseCategory {
  return value != null && isExpenseCategory(value) ? value : fallback;
}
