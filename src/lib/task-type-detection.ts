/**
 * Heuristic task type detection based on task name keywords.
 * Used for contextual bridges between features.
 */

const SHOPPING_KEYWORDS = ["compras", "supermercado", "comprar", "mercado", "super", "almacén", "verdulería"];
const COOKING_KEYWORDS = ["cocinar", "preparar", "almuerzo", "cena", "comida", "desayuno", "merienda", "receta"];

export type TaskType = "shopping" | "cooking" | "general";

export function detectTaskType(taskName: string): TaskType {
  const lower = taskName.toLowerCase();
  if (SHOPPING_KEYWORDS.some((kw) => lower.includes(kw))) return "shopping";
  if (COOKING_KEYWORDS.some((kw) => lower.includes(kw))) return "cooking";
  return "general";
}

export function hasTaskOfType(taskNames: string[], type: TaskType): boolean {
  return taskNames.some((name) => detectTaskType(name) === type);
}
