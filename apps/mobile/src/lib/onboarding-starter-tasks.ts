import { ONBOARDING_CATALOG } from "@habita/contracts";

import type { CatalogTask } from "@habita/contracts";

/** "¿Con quién vivís?" options, per handoff §5.3 Crear hogar. */
export type HouseholdComposition = "solo" | "pareja" | "compartida" | "familia";

export interface StarterTask {
  name: string;
  frequency: string;
  weight: number;
  estimatedMinutes: number;
}

const STARTER_TASK_NAMES: Record<HouseholdComposition, string[]> = {
  solo: ["Lavar platos", "Limpiar cocina", "Sacar basura", "Hacer cama", "Barrer"],
  pareja: [
    "Lavar platos", "Limpiar cocina", "Sacar basura", "Hacer cama", "Barrer",
    "Poner lavadora", "Preparar cena",
  ],
  compartida: [
    "Lavar platos", "Limpiar cocina", "Sacar basura", "Barrer",
    "Limpiar baños", "Trapear", "Organizar despensa",
  ],
  familia: [
    "Lavar platos", "Limpiar cocina", "Sacar basura", "Hacer cama", "Barrer",
    "Poner lavadora", "Preparar cena", "Preparar lonchera", "Ordenar juguetes",
  ],
};

const CATALOG_FLAT: CatalogTask[] = ONBOARDING_CATALOG.flatMap((category) => category.tasks);

function findCatalogTask(name: string): CatalogTask | undefined {
  return CATALOG_FLAT.find((task) => task.name === name);
}

/** Picks a small, sensible starter task set from the onboarding catalog for a given household composition. */
export function starterTasksFor(composition: HouseholdComposition): StarterTask[] {
  return STARTER_TASK_NAMES[composition].map((name) => {
    const found = findCatalogTask(name);
    return {
      name,
      frequency: found?.defaultFrequency.toUpperCase() ?? "WEEKLY",
      weight: found?.defaultWeight ?? 2,
      estimatedMinutes: found?.estimatedMinutes ?? 15,
    };
  });
}
