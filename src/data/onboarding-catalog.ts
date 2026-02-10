/**
 * Catálogo de tareas para onboarding. Lista determinística con iconos por tarea.
 * Fuente única: se usa en onboarding (sin fetch) y en suggest-tasks (base por defecto).
 */
export interface OnboardingCatalogTask {
  name: string;
  icon: string;
  defaultFrequency: string;
  defaultWeight: number;
  estimatedMinutes: number;
  minAge: number | null;
}

export interface OnboardingCatalogCategory {
  category: string;
  label: string;
  icon: string;
  tasks: OnboardingCatalogTask[];
}

const frequency = (f: "daily" | "weekly" | "biweekly" | "monthly") => f;
const min = (n: number) => n;

export const ONBOARDING_CATALOG: OnboardingCatalogCategory[] = [
  {
    category: "Cocina",
    label: "Cocina",
    icon: "🍳",
    tasks: [
      { name: "Lavar platos", icon: "🍽️", defaultFrequency: frequency("daily"), defaultWeight: 2, estimatedMinutes: 15, minAge: null },
      { name: "Limpiar cocina", icon: "🧽", defaultFrequency: frequency("daily"), defaultWeight: 3, estimatedMinutes: 20, minAge: null },
      { name: "Preparar desayuno", icon: "🥣", defaultFrequency: frequency("daily"), defaultWeight: 2, estimatedMinutes: 15, minAge: null },
      { name: "Preparar almuerzo", icon: "🍲", defaultFrequency: frequency("daily"), defaultWeight: 3, estimatedMinutes: 30, minAge: null },
      { name: "Preparar cena", icon: "🍽️", defaultFrequency: frequency("daily"), defaultWeight: 3, estimatedMinutes: 30, minAge: null },
      { name: "Organizar despensa", icon: "🗄️", defaultFrequency: frequency("weekly"), defaultWeight: 2, estimatedMinutes: 20, minAge: null },
    ],
  },
  {
    category: "Limpieza",
    label: "Limpieza",
    icon: "🧹",
    tasks: [
      { name: "Barrer", icon: "🧹", defaultFrequency: frequency("daily"), defaultWeight: 2, estimatedMinutes: 15, minAge: min(8) },
      { name: "Trapear", icon: "🪣", defaultFrequency: frequency("weekly"), defaultWeight: 2, estimatedMinutes: 25, minAge: null },
      { name: "Aspirar", icon: "🧹", defaultFrequency: frequency("weekly"), defaultWeight: 2, estimatedMinutes: 20, minAge: null },
      { name: "Limpiar baños", icon: "🚽", defaultFrequency: frequency("weekly"), defaultWeight: 3, estimatedMinutes: 25, minAge: null },
      { name: "Limpiar espejos", icon: "🪟", defaultFrequency: frequency("weekly"), defaultWeight: 1, estimatedMinutes: 10, minAge: min(10) },
      { name: "Sacudir muebles", icon: "🧹", defaultFrequency: frequency("weekly"), defaultWeight: 1, estimatedMinutes: 15, minAge: min(8) },
    ],
  },
  {
    category: "Lavandería",
    label: "Lavandería",
    icon: "👕",
    tasks: [
      { name: "Poner lavadora", icon: "🧺", defaultFrequency: frequency("weekly"), defaultWeight: 2, estimatedMinutes: 10, minAge: null },
      { name: "Tender ropa", icon: "👕", defaultFrequency: frequency("weekly"), defaultWeight: 2, estimatedMinutes: 15, minAge: min(10) },
      { name: "Doblar ropa", icon: "📦", defaultFrequency: frequency("weekly"), defaultWeight: 2, estimatedMinutes: 20, minAge: min(8) },
      { name: "Planchar", icon: "🧥", defaultFrequency: frequency("weekly"), defaultWeight: 3, estimatedMinutes: 30, minAge: null },
      { name: "Guardar ropa", icon: "📦", defaultFrequency: frequency("weekly"), defaultWeight: 1, estimatedMinutes: 10, minAge: min(6) },
    ],
  },
  {
    category: "Habitación",
    label: "Habitaciones",
    icon: "🛏️",
    tasks: [
      { name: "Hacer cama", icon: "🛏️", defaultFrequency: frequency("daily"), defaultWeight: 1, estimatedMinutes: 5, minAge: min(6) },
      { name: "Ordenar habitación", icon: "🧸", defaultFrequency: frequency("daily"), defaultWeight: 2, estimatedMinutes: 15, minAge: min(6) },
      { name: "Cambiar sábanas", icon: "🛏️", defaultFrequency: frequency("weekly"), defaultWeight: 2, estimatedMinutes: 15, minAge: null },
    ],
  },
  {
    category: "Exterior",
    label: "Exterior",
    icon: "🌿",
    tasks: [
      { name: "Sacar basura", icon: "🗑️", defaultFrequency: frequency("daily"), defaultWeight: 1, estimatedMinutes: 5, minAge: min(10) },
      { name: "Regar plantas", icon: "🌱", defaultFrequency: frequency("daily"), defaultWeight: 1, estimatedMinutes: 10, minAge: min(6) },
      { name: "Cortar pasto", icon: "🌿", defaultFrequency: frequency("biweekly"), defaultWeight: 4, estimatedMinutes: 45, minAge: null },
      { name: "Limpiar patio", icon: "🧹", defaultFrequency: frequency("weekly"), defaultWeight: 3, estimatedMinutes: 30, minAge: null },
    ],
  },
  {
    category: "Compras",
    label: "Compras",
    icon: "🛒",
    tasks: [
      { name: "Hacer lista de compras", icon: "📝", defaultFrequency: frequency("weekly"), defaultWeight: 1, estimatedMinutes: 10, minAge: null },
      { name: "Ir al supermercado", icon: "🛒", defaultFrequency: frequency("weekly"), defaultWeight: 3, estimatedMinutes: 60, minAge: null },
      { name: "Guardar compras", icon: "📦", defaultFrequency: frequency("weekly"), defaultWeight: 2, estimatedMinutes: 15, minAge: min(8) },
    ],
  },
  {
    category: "Mascotas",
    label: "Mascotas",
    icon: "🐕",
    tasks: [
      { name: "Alimentar mascotas", icon: "🐕", defaultFrequency: frequency("daily"), defaultWeight: 1, estimatedMinutes: 5, minAge: min(6) },
      { name: "Pasear perro", icon: "🦮", defaultFrequency: frequency("daily"), defaultWeight: 2, estimatedMinutes: 30, minAge: min(12) },
      { name: "Limpiar arenero", icon: "🐱", defaultFrequency: frequency("daily"), defaultWeight: 2, estimatedMinutes: 10, minAge: null },
      { name: "Bañar mascotas", icon: "🛁", defaultFrequency: frequency("biweekly"), defaultWeight: 3, estimatedMinutes: 30, minAge: null },
    ],
  },
  {
    category: "Niños",
    label: "Niños",
    icon: "👶",
    tasks: [
      { name: "Preparar lonchera", icon: "🎒", defaultFrequency: frequency("daily"), defaultWeight: 2, estimatedMinutes: 15, minAge: null },
      { name: "Revisar tareas escolares", icon: "📚", defaultFrequency: frequency("daily"), defaultWeight: 2, estimatedMinutes: 20, minAge: null },
      { name: "Ordenar juguetes", icon: "🧸", defaultFrequency: frequency("daily"), defaultWeight: 1, estimatedMinutes: 15, minAge: null },
    ],
  },
];

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
