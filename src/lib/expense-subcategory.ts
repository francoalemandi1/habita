import { inferExpenseSubcategory as inferFromDomain } from "@habita/domain/expense-subcategory";

import type { ExpenseCategory, ExpenseSubcategory } from "@prisma/client";

export function inferExpenseSubcategory(title: string, category: ExpenseCategory): ExpenseSubcategory {
  return inferFromDomain(title, category) as ExpenseSubcategory;
}

