import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { isAIEnabled, getLLMProvider } from "@/lib/llm/provider";
import { onboardingSetupInputSchema } from "@habita/contracts";
import { ONBOARDING_CATALOG } from "@/data/onboarding-catalog";
import { extractStringArray } from "@habita/domain/onboarding-profile";

import type { NextRequest } from "next/server";
import type { OnboardingSetupResponse, OnboardingSetupTask } from "@habita/contracts";

const FREQ_UP: Record<string, OnboardingSetupTask["frequency"]> = {
  daily: "DAILY",
  weekly: "WEEKLY",
  biweekly: "BIWEEKLY",
  monthly: "MONTHLY",
};

/** Fallback: 5 essential tasks from the static catalog. */
function getEssentialTasks(): OnboardingSetupTask[] {
  const essentials = new Set([
    "Lavar platos", "Limpiar cocina", "Barrer", "Sacar basura", "Hacer cama",
  ]);
  return ONBOARDING_CATALOG.flatMap((cat) => cat.tasks)
    .filter((t) => essentials.has(t.name))
    .map((t) => ({
      name: t.name,
      frequency: (FREQ_UP[t.defaultFrequency] ?? "WEEKLY") as OnboardingSetupTask["frequency"],
      weight: t.defaultWeight,
      estimatedMinutes: t.estimatedMinutes ?? 15,
    }));
}

function buildFallbackResponse(): OnboardingSetupResponse {
  return {
    tasks: getEssentialTasks(),
    householdProfile: {},
    insights: [],
    dietaryHints: [],
    shoppingContext: [],
  };
}

function buildPrompt(description: string, isSoloMode: boolean, memberName?: string): string {
  return `Sos un experto en organización del hogar argentino. El usuario describe su hogar en lenguaje natural durante el onboarding. Analizá la descripción y devolvé un setup personalizado.

## Descripción del usuario
"${description}"

## Contexto
- Modo: ${isSoloMode ? "Vive solo/a" : "Hogar compartido (con más personas)"}
${memberName ? `- Nombre: ${memberName}` : ""}

## Instrucciones

### Tareas (campo "tasks")
Generá entre 10 y 20 tareas del hogar relevantes al contexto descrito. Cada tarea debe tener:
- name: nombre corto y claro en español argentino
- frequency: "DAILY", "WEEKLY", "BIWEEKLY" o "MONTHLY"
- weight: 1 (muy fácil) a 5 (difícil/larga)
- estimatedMinutes: duración estimada realista
- reason: por qué aplica a este hogar (1 oración corta)

Incluí siempre las básicas (lavar platos, barrer, sacar basura, hacer cama, limpiar cocina) más tareas específicas al contexto:
- Si mencionan mascotas → tareas de cuidado animal
- Si mencionan niños → tareas de cuidado infantil
- Si mencionan jardín/terraza/balcón → tareas de exterior
- Si mencionan tipo de vivienda (depto/casa) → tareas relevantes
- Calibrá las frecuencias según lo que describe (ej: "limpio a fondo los fines" → limpieza profunda WEEKLY)

### Perfil del hogar (campo "householdProfile")
Inferí lo que puedas de la descripción:
- city: ciudad/zona si la mencionan (ej: "Palermo" → "Buenos Aires"). null si no se infiere
- timezone: zona horaria IANA si inferible (ej: "America/Argentina/Buenos_Aires"). null si no se infiere
- planningDay: día ideal para planificar (0=domingo..6=sábado). Inferilo del estilo de vida (ej: trabaja L-V → 0 o 6). null si no se infiere
- occupationLevel: "BUSY" si mencionan trabajo tiempo completo o mucha actividad, "MODERATE" si no mencionan o es ambiguo, "AVAILABLE" si mencionan tiempo libre o disponibilidad
- suggestedHouseholdName: un nombre corto y lindo para el hogar basado en el contexto (ej: "Depto Palermo", "Casa García"). null si no hay contexto suficiente

### Insights (campo "insights")
2-4 tips personalizados y útiles basados en la situación (ej: "Con un gato, aspirá pelos del sillón 2-3 veces por semana").

### Preferencias alimentarias (campo "dietaryHints")
Si mencionan algo sobre alimentación (vegetariano, celíaco, vegano, etc.) extraelo como array de strings. Array vacío si no mencionan nada.

### Contexto de compras (campo "shoppingContext")
Si mencionan zona/barrio, indicá supermercados o comercios cercanos típicos. Array vacío si no hay datos.

## Formato de respuesta
Respondé SOLO con JSON válido con los campos: tasks, householdProfile, insights, dietaryHints, shoppingContext.`;
}

/**
 * POST /api/ai/onboarding-setup
 * Analyze household description and return personalized setup data.
 * Falls back to essential tasks if AI is disabled or fails.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body: unknown = await request.json();
    const validation = onboardingSetupInputSchema.safeParse(body);
    if (!validation.success) {
      const message = validation.error.errors[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { householdDescription, isSoloMode, memberName } = validation.data;

    if (!isAIEnabled()) {
      return NextResponse.json(buildFallbackResponse());
    }

    try {
      const provider = await getLLMProvider();
      const result = await provider.completeWithSchema<OnboardingSetupResponse>({
        prompt: buildPrompt(householdDescription, isSoloMode, memberName),
        outputSchema: {
          tasks: "array of {name, frequency, weight, estimatedMinutes, reason?}",
          householdProfile: "{city?, timezone?, planningDay?, occupationLevel?, suggestedHouseholdName?}",
          insights: "array of strings",
          dietaryHints: "array of strings",
          shoppingContext: "array of strings",
        },
        modelVariant: "standard",
        timeoutMs: 25_000,
      });

      // Validate and sanitize tasks
      const validFreqs = new Set(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]);
      const tasks: OnboardingSetupTask[] = (result.tasks ?? [])
        .filter((t) => t.name && typeof t.name === "string")
        .map((t) => ({
          name: t.name.slice(0, 100),
          frequency: validFreqs.has(t.frequency) ? t.frequency : "WEEKLY",
          weight: Math.max(1, Math.min(5, Math.round(t.weight ?? 2))),
          estimatedMinutes: Math.max(1, Math.min(480, Math.round(t.estimatedMinutes ?? 15))),
          reason: t.reason?.slice(0, 200),
        }));

      // Sanitize profile
      const profile = result.householdProfile ?? {};
      const validOccupation = new Set(["BUSY", "MODERATE", "AVAILABLE"]);

      const response: OnboardingSetupResponse = {
        tasks: tasks.length >= 5 ? tasks : [...tasks, ...getEssentialTasks().filter((e) => !tasks.some((t) => t.name === e.name))],
        householdProfile: {
          city: typeof profile.city === "string" ? profile.city.slice(0, 100) : null,
          timezone: typeof profile.timezone === "string" ? profile.timezone.slice(0, 100) : null,
          planningDay: typeof profile.planningDay === "number" && profile.planningDay >= 0 && profile.planningDay <= 6
            ? Math.round(profile.planningDay)
            : null,
          occupationLevel: validOccupation.has(profile.occupationLevel ?? "") ? profile.occupationLevel : "MODERATE",
          suggestedHouseholdName: typeof profile.suggestedHouseholdName === "string"
            ? profile.suggestedHouseholdName.slice(0, 50)
            : null,
        },
        insights: extractStringArray(result.insights, 500, 5),
        dietaryHints: extractStringArray(result.dietaryHints, 100, 10),
        shoppingContext: extractStringArray(result.shoppingContext, 200, 10),
      };

      return NextResponse.json(response);
    } catch (aiError) {
      console.error("[onboarding-setup] AI failed, using fallback:", aiError);
      return NextResponse.json(buildFallbackResponse());
    }
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/onboarding-setup", method: "POST" });
  }
}
