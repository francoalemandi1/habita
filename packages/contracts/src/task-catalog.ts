import { z } from "zod";

export const catalogTaskSchema = z.object({
  name: z.string(),
  icon: z.string(),
  defaultFrequency: z.string(),
  defaultWeight: z.number(),
  estimatedMinutes: z.number().nullable(),
  minAge: z.number().nullable(),
});

export const catalogCategorySchema = z.object({
  category: z.string(),
  label: z.string(),
  icon: z.string(),
  tasks: z.array(catalogTaskSchema),
});

export const catalogResponseSchema = z.object({
  categories: z.array(catalogCategorySchema),
});

export type CatalogTask = z.infer<typeof catalogTaskSchema>;
export type CatalogCategory = z.infer<typeof catalogCategorySchema>;
export type CatalogResponse = z.infer<typeof catalogResponseSchema>;

/**
 * Catálogo de tareas para onboarding. Lista determinística con iconos por tarea.
 * Fuente única: se usa en onboarding (sin fetch) y en suggest-tasks (base por defecto).
 */
export const ONBOARDING_CATALOG: CatalogCategory[] = [
  {
    category: "Cocina",
    label: "Cocina",
    icon: "🍳",
    tasks: [
      { name: "Lavar platos", icon: "🍽️", defaultFrequency: "daily", defaultWeight: 2, estimatedMinutes: 15, minAge: null },
      { name: "Limpiar cocina", icon: "🧽", defaultFrequency: "daily", defaultWeight: 3, estimatedMinutes: 20, minAge: null },
      { name: "Preparar desayuno", icon: "🥣", defaultFrequency: "daily", defaultWeight: 2, estimatedMinutes: 15, minAge: null },
      { name: "Preparar almuerzo", icon: "🍲", defaultFrequency: "daily", defaultWeight: 3, estimatedMinutes: 30, minAge: null },
      { name: "Preparar cena", icon: "🍽️", defaultFrequency: "daily", defaultWeight: 3, estimatedMinutes: 30, minAge: null },
      { name: "Organizar despensa", icon: "🗄️", defaultFrequency: "weekly", defaultWeight: 2, estimatedMinutes: 20, minAge: null },
    ],
  },
  {
    category: "Limpieza",
    label: "Limpieza",
    icon: "🧹",
    tasks: [
      { name: "Barrer", icon: "🧹", defaultFrequency: "daily", defaultWeight: 2, estimatedMinutes: 15, minAge: 8 },
      { name: "Trapear", icon: "🪣", defaultFrequency: "weekly", defaultWeight: 2, estimatedMinutes: 25, minAge: null },
      { name: "Aspirar", icon: "🧹", defaultFrequency: "weekly", defaultWeight: 2, estimatedMinutes: 20, minAge: null },
      { name: "Limpiar baños", icon: "🚽", defaultFrequency: "weekly", defaultWeight: 3, estimatedMinutes: 25, minAge: null },
      { name: "Limpiar espejos", icon: "🪟", defaultFrequency: "weekly", defaultWeight: 1, estimatedMinutes: 10, minAge: 10 },
      { name: "Sacudir muebles", icon: "🧹", defaultFrequency: "weekly", defaultWeight: 1, estimatedMinutes: 15, minAge: 8 },
    ],
  },
  {
    category: "Lavandería",
    label: "Lavandería",
    icon: "👕",
    tasks: [
      { name: "Poner lavadora", icon: "🧺", defaultFrequency: "weekly", defaultWeight: 2, estimatedMinutes: 10, minAge: null },
      { name: "Tender ropa", icon: "👕", defaultFrequency: "weekly", defaultWeight: 2, estimatedMinutes: 15, minAge: 10 },
      { name: "Doblar ropa", icon: "📦", defaultFrequency: "weekly", defaultWeight: 2, estimatedMinutes: 20, minAge: 8 },
      { name: "Planchar", icon: "🧥", defaultFrequency: "weekly", defaultWeight: 3, estimatedMinutes: 30, minAge: null },
      { name: "Guardar ropa", icon: "📦", defaultFrequency: "weekly", defaultWeight: 1, estimatedMinutes: 10, minAge: 6 },
    ],
  },
  {
    category: "Habitación",
    label: "Habitaciones",
    icon: "🛏️",
    tasks: [
      { name: "Hacer cama", icon: "🛏️", defaultFrequency: "daily", defaultWeight: 1, estimatedMinutes: 5, minAge: 6 },
      { name: "Ordenar habitación", icon: "🧸", defaultFrequency: "daily", defaultWeight: 2, estimatedMinutes: 15, minAge: 6 },
      { name: "Cambiar sábanas", icon: "🛏️", defaultFrequency: "weekly", defaultWeight: 2, estimatedMinutes: 15, minAge: null },
    ],
  },
  {
    category: "Exterior",
    label: "Exterior",
    icon: "🌿",
    tasks: [
      { name: "Sacar basura", icon: "🗑️", defaultFrequency: "daily", defaultWeight: 1, estimatedMinutes: 5, minAge: 10 },
      { name: "Regar plantas", icon: "🌱", defaultFrequency: "daily", defaultWeight: 1, estimatedMinutes: 10, minAge: 6 },
      { name: "Cortar pasto", icon: "🌿", defaultFrequency: "biweekly", defaultWeight: 4, estimatedMinutes: 45, minAge: null },
      { name: "Limpiar patio", icon: "🧹", defaultFrequency: "weekly", defaultWeight: 3, estimatedMinutes: 30, minAge: null },
    ],
  },
  {
    category: "Compras",
    label: "Compras",
    icon: "🛒",
    tasks: [
      { name: "Hacer lista de compras", icon: "📝", defaultFrequency: "weekly", defaultWeight: 1, estimatedMinutes: 10, minAge: null },
      { name: "Ir al supermercado", icon: "🛒", defaultFrequency: "weekly", defaultWeight: 3, estimatedMinutes: 60, minAge: null },
      { name: "Guardar compras", icon: "📦", defaultFrequency: "weekly", defaultWeight: 2, estimatedMinutes: 15, minAge: 8 },
    ],
  },
  {
    category: "Mascotas",
    label: "Mascotas",
    icon: "🐕",
    tasks: [
      { name: "Alimentar mascotas", icon: "🐕", defaultFrequency: "daily", defaultWeight: 1, estimatedMinutes: 5, minAge: 6 },
      { name: "Pasear perro", icon: "🦮", defaultFrequency: "daily", defaultWeight: 2, estimatedMinutes: 30, minAge: 12 },
      { name: "Limpiar arenero", icon: "🐱", defaultFrequency: "daily", defaultWeight: 2, estimatedMinutes: 10, minAge: null },
      { name: "Bañar mascotas", icon: "🛁", defaultFrequency: "biweekly", defaultWeight: 3, estimatedMinutes: 30, minAge: null },
    ],
  },
  {
    category: "Niños",
    label: "Niños",
    icon: "👶",
    tasks: [
      { name: "Preparar lonchera", icon: "🎒", defaultFrequency: "daily", defaultWeight: 2, estimatedMinutes: 15, minAge: null },
      { name: "Revisar tareas escolares", icon: "📚", defaultFrequency: "daily", defaultWeight: 2, estimatedMinutes: 20, minAge: null },
      { name: "Ordenar juguetes", icon: "🧸", defaultFrequency: "daily", defaultWeight: 1, estimatedMinutes: 15, minAge: null },
    ],
  },
];
