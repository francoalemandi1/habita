import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { isAIEnabled, getLLMProvider } from "@/lib/llm/provider";
import { z } from "zod";
import { ONBOARDING_CATALOG } from "@/data/onboarding-catalog";

import type { NextRequest } from "next/server";

const suggestTasksSchema = z.object({
  hasChildren: z.boolean().optional().default(false),
  hasPets: z.boolean().optional().default(false),
  location: z.string().max(200).optional(),
  householdDescription: z.string().max(1000).optional(),
});

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

const FREQ_UP: Record<string, SuggestedTask["frequency"]> = {
  daily: "DAILY",
  weekly: "WEEKLY",
  biweekly: "BIWEEKLY",
  monthly: "MONTHLY",
};

function catalogToTaskCategories(hasPets: boolean, hasChildren: boolean): TaskCategory[] {
  return ONBOARDING_CATALOG.filter((cat) => {
    if (cat.category === "Mascotas") return hasPets;
    if (cat.category === "Niños") return hasChildren;
    return true;
  }).map((cat) => ({
    name: cat.category.toLowerCase(),
    label: cat.label,
    icon: cat.icon,
    tasks: cat.tasks.map((t) => ({
      name: t.name,
      frequency: (FREQ_UP[t.defaultFrequency] ?? "WEEKLY") as SuggestedTask["frequency"],
      category: cat.category.toLowerCase(),
      icon: t.icon,
      estimatedMinutes: t.estimatedMinutes,
      weight: t.defaultWeight,
    })),
  }));
}

/**
 * POST /api/ai/suggest-tasks
 * Generate dynamic task suggestions based on household context.
 * Uses AI to enhance suggestions when available.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body: unknown = await request.json();
    const validation = suggestTasksSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { hasChildren, hasPets, location, householdDescription } = validation.data;

    // Base categories from deterministic catalog (Mascotas/Niños only if hasPets/hasChildren)
    const categories: TaskCategory[] = catalogToTaskCategories(hasPets, hasChildren).map((cat) => ({
      ...cat,
      tasks: [...cat.tasks],
    }));

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
    return handleApiError(error, { route: "/api/ai/suggest-tasks", method: "POST" });
  }
}

function buildAIPrompt(context: z.infer<typeof suggestTasksSchema>): string {
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
