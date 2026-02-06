import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { isAIEnabled, getLLMProvider } from "@/lib/llm/provider";

import type { NextRequest } from "next/server";

interface SuggestTasksBody {
  hasChildren?: boolean;
  hasPets?: boolean;
  location?: string;
  householdDescription?: string;
}

interface SuggestedTask {
  name: string;
  frequency: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  category: string;
  icon: string;
  estimatedMinutes: number;
  weight: number;
  reason?: string;
}

interface TaskCategory {
  name: string;
  label: string;
  icon: string;
  tasks: SuggestedTask[];
}

// Default tasks organized by category
const DEFAULT_CATEGORIES: TaskCategory[] = [
  {
    name: "cocina",
    label: "Cocina",
    icon: "🍳",
    tasks: [
      { name: "Lavar platos", frequency: "DAILY", category: "cocina", icon: "🍽️", estimatedMinutes: 15, weight: 2 },
      { name: "Limpiar cocina", frequency: "DAILY", category: "cocina", icon: "🧽", estimatedMinutes: 20, weight: 3 },
      { name: "Preparar desayuno", frequency: "DAILY", category: "cocina", icon: "🥣", estimatedMinutes: 15, weight: 2 },
      { name: "Preparar almuerzo", frequency: "DAILY", category: "cocina", icon: "🍲", estimatedMinutes: 30, weight: 3 },
      { name: "Preparar cena", frequency: "DAILY", category: "cocina", icon: "🍽️", estimatedMinutes: 30, weight: 3 },
      { name: "Organizar despensa", frequency: "WEEKLY", category: "cocina", icon: "🗄️", estimatedMinutes: 20, weight: 2 },
    ],
  },
  {
    name: "limpieza",
    label: "Limpieza",
    icon: "🧹",
    tasks: [
      { name: "Barrer pisos", frequency: "DAILY", category: "limpieza", icon: "🧹", estimatedMinutes: 15, weight: 2 },
      { name: "Trapear pisos", frequency: "WEEKLY", category: "limpieza", icon: "🪣", estimatedMinutes: 20, weight: 2 },
      { name: "Aspirar alfombras", frequency: "WEEKLY", category: "limpieza", icon: "🧹", estimatedMinutes: 20, weight: 2 },
      { name: "Limpiar baños", frequency: "WEEKLY", category: "limpieza", icon: "🚽", estimatedMinutes: 25, weight: 3 },
      { name: "Sacar basura", frequency: "DAILY", category: "limpieza", icon: "🗑️", estimatedMinutes: 5, weight: 1 },
      { name: "Limpiar ventanas", frequency: "MONTHLY", category: "limpieza", icon: "🪟", estimatedMinutes: 30, weight: 3 },
    ],
  },
  {
    name: "lavanderia",
    label: "Lavandería",
    icon: "👕",
    tasks: [
      { name: "Lavar ropa", frequency: "WEEKLY", category: "lavanderia", icon: "🧺", estimatedMinutes: 20, weight: 2 },
      { name: "Tender ropa", frequency: "WEEKLY", category: "lavanderia", icon: "👕", estimatedMinutes: 15, weight: 2 },
      { name: "Planchar ropa", frequency: "WEEKLY", category: "lavanderia", icon: "🧥", estimatedMinutes: 30, weight: 3 },
      { name: "Doblar y guardar ropa", frequency: "WEEKLY", category: "lavanderia", icon: "📦", estimatedMinutes: 20, weight: 2 },
    ],
  },
  {
    name: "exterior",
    label: "Exterior",
    icon: "🌳",
    tasks: [
      { name: "Regar plantas", frequency: "DAILY", category: "exterior", icon: "🌱", estimatedMinutes: 10, weight: 1 },
      { name: "Cortar pasto", frequency: "BIWEEKLY", category: "exterior", icon: "🌿", estimatedMinutes: 45, weight: 4 },
      { name: "Limpiar patio", frequency: "WEEKLY", category: "exterior", icon: "🧹", estimatedMinutes: 30, weight: 3 },
    ],
  },
  {
    name: "compras",
    label: "Compras",
    icon: "🛒",
    tasks: [
      { name: "Hacer lista de compras", frequency: "WEEKLY", category: "compras", icon: "📝", estimatedMinutes: 10, weight: 1 },
      { name: "Ir al supermercado", frequency: "WEEKLY", category: "compras", icon: "🛒", estimatedMinutes: 60, weight: 3 },
      { name: "Guardar compras", frequency: "WEEKLY", category: "compras", icon: "📦", estimatedMinutes: 15, weight: 2 },
    ],
  },
];

const PET_CATEGORY: TaskCategory = {
  name: "mascotas",
  label: "Mascotas",
  icon: "🐾",
  tasks: [
    { name: "Alimentar mascotas", frequency: "DAILY", category: "mascotas", icon: "🐕", estimatedMinutes: 10, weight: 1 },
    { name: "Pasear al perro", frequency: "DAILY", category: "mascotas", icon: "🦮", estimatedMinutes: 30, weight: 2 },
    { name: "Limpiar arenero", frequency: "DAILY", category: "mascotas", icon: "🐱", estimatedMinutes: 10, weight: 1 },
    { name: "Bañar mascotas", frequency: "BIWEEKLY", category: "mascotas", icon: "🛁", estimatedMinutes: 30, weight: 3 },
  ],
};

const CHILDREN_CATEGORY: TaskCategory = {
  name: "niños",
  label: "Niños",
  icon: "👶",
  tasks: [
    { name: "Preparar lonchera", frequency: "DAILY", category: "niños", icon: "🎒", estimatedMinutes: 15, weight: 2 },
    { name: "Revisar tareas escolares", frequency: "DAILY", category: "niños", icon: "📚", estimatedMinutes: 20, weight: 2 },
    { name: "Ordenar juguetes", frequency: "DAILY", category: "niños", icon: "🧸", estimatedMinutes: 15, weight: 1 },
  ],
};

/**
 * POST /api/ai/suggest-tasks
 * Generate dynamic task suggestions based on household context.
 * Uses AI to enhance suggestions when available.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body: unknown = await request.json();
    const {
      hasChildren = false,
      hasPets = false,
      location,
      householdDescription
    } = body as SuggestTasksBody;

    // Start with default categories
    const categories: TaskCategory[] = DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      tasks: [...cat.tasks],
    }));

    // Add pet tasks if applicable
    if (hasPets) {
      categories.push({ ...PET_CATEGORY, tasks: [...PET_CATEGORY.tasks] });
    }

    // Add children tasks if applicable
    if (hasChildren) {
      categories.push({ ...CHILDREN_CATEGORY, tasks: [...CHILDREN_CATEGORY.tasks] });
    }

    let insights: string[] = [];

    // If AI is enabled, enhance suggestions
    if (isAIEnabled() && (location || householdDescription)) {
      try {
        const provider = getLLMProvider();
        const aiResult = await provider.completeWithSchema<{
          additionalTasks: Array<{
            name: string;
            frequency: string;
            category: string;
            icon: string;
            estimatedMinutes: number;
            weight: number;
            reason: string;
          }>;
          insights: string[];
        }>({
          prompt: buildAIPrompt({ hasChildren, hasPets, location, householdDescription }),
          outputSchema: {
            additionalTasks: "array of task objects with name, frequency, category, icon, estimatedMinutes, weight, reason",
            insights: "array of insight strings",
          },
          modelVariant: "fast",
        });

        // Add AI-suggested tasks to appropriate categories
        if (aiResult.additionalTasks && aiResult.additionalTasks.length > 0) {
          for (const task of aiResult.additionalTasks) {
            const freq = task.frequency.toUpperCase() as SuggestedTask["frequency"];
            const validFreq = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"].includes(freq) ? freq : "WEEKLY";

            const suggestedTask: SuggestedTask = {
              name: task.name,
              frequency: validFreq,
              category: task.category,
              icon: task.icon || "📋",
              estimatedMinutes: task.estimatedMinutes || 15,
              weight: task.weight || 2,
              reason: task.reason,
            };

            const existingCategory = categories.find((c) => c.name === task.category);
            if (existingCategory) {
              // Avoid duplicates
              if (!existingCategory.tasks.some((t) => t.name.toLowerCase() === task.name.toLowerCase())) {
                existingCategory.tasks.push(suggestedTask);
              }
            } else {
              // Create new category
              categories.push({
                name: task.category,
                label: task.category.charAt(0).toUpperCase() + task.category.slice(1),
                icon: task.icon || "📋",
                tasks: [suggestedTask],
              });
            }
          }
        }

        insights = aiResult.insights || [];
      } catch (aiError) {
        console.error("AI suggestion enhancement failed:", aiError);
        // Continue with default suggestions
      }
    }

    // Generate contextual insights if AI didn't provide them
    if (insights.length === 0) {
      if (hasChildren && hasPets) {
        insights.push("Los niños pueden ayudar con tareas simples de mascotas");
      }
      if (hasPets) {
        insights.push("Las mascotas requieren atención diaria constante");
      }
      if (hasChildren) {
        insights.push("Considera asignar tareas simples a los niños para fomentar responsabilidad");
      }
    }

    return NextResponse.json({
      categories,
      insights,
    });
  } catch (error) {
    console.error("POST /api/ai/suggest-tasks error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Error al sugerir tareas" },
      { status: 500 }
    );
  }
}

function buildAIPrompt(context: SuggestTasksBody): string {
  return `Eres un experto en organización del hogar. Genera sugerencias de tareas adicionales basadas en el contexto.

## Contexto del hogar
- Tiene niños: ${context.hasChildren ? "sí" : "no"}
- Tiene mascotas: ${context.hasPets ? "sí" : "no"}
${context.location ? `- Ubicación: ${context.location}` : ""}
${context.householdDescription ? `- Descripción: ${context.householdDescription}` : ""}

## Instrucciones
Genera tareas adicionales que sean relevantes para este hogar específico. Considera:
- Si hay niños, tareas relacionadas con su cuidado y educación
- Si hay mascotas, tareas específicas de cuidado animal
- Si se proporciona ubicación, tareas típicas de esa región/clima (ej: en climas fríos, revisar calefacción)

Responde SOLO con JSON válido:
{
  "additionalTasks": [
    {
      "name": "Nombre de la tarea",
      "frequency": "DAILY|WEEKLY|BIWEEKLY|MONTHLY",
      "category": "cocina|limpieza|lavanderia|exterior|compras|mascotas|niños|mantenimiento",
      "icon": "emoji apropiado",
      "estimatedMinutes": número entre 5 y 120,
      "weight": número entre 1 y 5 (dificultad),
      "reason": "Por qué es relevante para este hogar"
    }
  ],
  "insights": [
    "Consejo útil basado en el contexto del hogar"
  ]
}

Reglas:
- Máximo 5 tareas adicionales
- Máximo 3 insights
- Las tareas deben ser prácticas y realistas
- Evita duplicar tareas comunes (lavar platos, barrer, etc.)
- El peso (weight) indica dificultad: 1=muy fácil, 5=difícil`;
}
