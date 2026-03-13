/**
 * Re-export del catálogo de onboarding desde @habita/contracts (fuente única).
 * Mantiene compatibilidad con imports existentes en web.
 */
export { ONBOARDING_CATALOG } from "@habita/contracts";
export type { CatalogCategory as OnboardingCatalogCategory, CatalogTask as OnboardingCatalogTask } from "@habita/contracts";

// ─── Helpers (web-only, usan el catálogo para lookups) ──────────────────────

import { ONBOARDING_CATALOG } from "@habita/contracts";

/** Mapa nombre de tarea → emoji (para UI que muestra tareas con su icono). Fuente: catálogo de onboarding. */
const TASK_ICON_MAP = new Map<string, string>();

/** Mapa nombre de tarea → categoría (label + icono de categoría). */
const TASK_CATEGORY_MAP = new Map<string, { label: string; icon: string }>();

for (const cat of ONBOARDING_CATALOG) {
  for (const task of cat.tasks) {
    TASK_ICON_MAP.set(task.name, task.icon);
    TASK_CATEGORY_MAP.set(task.name, { label: cat.label, icon: cat.icon });
  }
}

export function getTaskIcon(taskName: string): string {
  return TASK_ICON_MAP.get(taskName) ?? "📋";
}

export function getTaskCategoryMeta(taskName: string): { label: string; icon: string } {
  return TASK_CATEGORY_MAP.get(taskName) ?? { label: "Otras", icon: "📋" };
}
