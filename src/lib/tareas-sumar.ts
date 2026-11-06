import { parseTaskFrequency } from "./tareas-frequency";

import type { TaskFrequency } from "@prisma/client";

export interface SumarTaskItem {
  name: string;
  icon: string;
  frequency: TaskFrequency;
  weight: number;
  estimatedMinutes: number | null;
}

export interface SumarCategory {
  name: string;
  label: string;
  icon: string;
  tasks: SumarTaskItem[];
}

export interface CatalogCategoryLite {
  category: string;
  label: string;
  icon: string;
  tasks: Array<{ name: string; icon: string; defaultFrequency: string; defaultWeight: number; estimatedMinutes: number | null }>;
}

export interface SuggestCategoryLite {
  name: string;
  label: string;
  icon: string;
  tasks: Array<{ name: string; icon: string; frequency: TaskFrequency; weight: number; estimatedMinutes: number }>;
}

/** GET /api/tasks/catalog groups use lowercase frequencies; the rest of the app reads uppercase `TaskFrequency`. */
export function mapCatalogToSumarCategories(categories: readonly CatalogCategoryLite[]): SumarCategory[] {
  return categories.map((category) => ({
    name: category.category,
    label: category.label,
    icon: category.icon,
    tasks: category.tasks.map((task) => ({
      name: task.name,
      icon: task.icon,
      frequency: parseTaskFrequency(task.defaultFrequency),
      weight: task.defaultWeight,
      estimatedMinutes: task.estimatedMinutes,
    })),
  }));
}

/** Footer button label for the batch-add bar — pending state, then singular/plural count. */
export function sumarLabel(count: number, isAdding: boolean): string {
  if (isAdding) return "Sumando…";
  return `Sumar ${count} ${count === 1 ? "tarea" : "tareas"}`;
}

/** POST /api/ai/suggest-tasks already returns uppercase frequencies — just reshape to the shared Sumar item. */
export function mapSuggestionsToSumarCategories(categories: readonly SuggestCategoryLite[]): SumarCategory[] {
  return categories.map((category) => ({
    name: category.name,
    label: category.label,
    icon: category.icon,
    tasks: category.tasks.map((task) => ({
      name: task.name,
      icon: task.icon,
      frequency: task.frequency,
      weight: task.weight,
      estimatedMinutes: task.estimatedMinutes,
    })),
  }));
}
