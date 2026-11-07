/**
 * `SerializedService.category` / `.frequency` are loosely typed as `string`
 * at the API boundary (DB enums serialized to JSON). These guards replace
 * unvalidated `as ExpenseCategory` / `as RecurringFrequency` casts with a
 * real membership check against the known values.
 */
import type { ExpenseCategory, RecurringFrequency } from "@prisma/client";

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

export const RECURRING_FREQUENCIES: readonly RecurringFrequency[] = [
  "WEEKLY",
  "MONTHLY",
  "BIMONTHLY",
  "QUARTERLY",
  "YEARLY",
];

const RECURRING_FREQUENCY_SET = new Set<string>(RECURRING_FREQUENCIES);

export function isRecurringFrequency(value: string): value is RecurringFrequency {
  return RECURRING_FREQUENCY_SET.has(value);
}

/** Narrows a loosely-typed frequency string, falling back when it isn't a known frequency. */
export function toRecurringFrequency(value: string | null | undefined, fallback: RecurringFrequency): RecurringFrequency {
  return value != null && isRecurringFrequency(value) ? value : fallback;
}
