import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeDueDateForFrequency } from "@/lib/due-date";
import { partitionTasksByDuration, durationLabel } from "@/lib/plan-duration";
import { isAIEnabled, getAIProviderType } from "./provider";
import { generateAIPlanOpenRouter } from "./openrouter-provider";
import { buildRegionalContext } from "./regional-context";

import type { TaskFrequency } from "@prisma/client";
import type { LanguageModel } from "ai";
import type { ExcludedTask } from "@/lib/plan-duration";

function getModel(): LanguageModel | null {
  const providerType = getAIProviderType();

  if (providerType === "openrouter") {
    return null; // OpenRouter uses its own SDK
  }

  if (providerType === "gemini") {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return google("gemini-1.5-flash");
  }

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  return anthropic("claude-3-5-haiku-latest");
}

const assignmentSchema = z.object({
  assignments: z.array(
    z.object({
      taskName: z.string(),
      memberId: z.string().describe("ID del miembro (tal como aparece en la lista de miembros)"),
      memberName: z.string().describe("Nombre del miembro (para referencia)"),
      reason: z.string().describe("Breve justificación de la asignación"),
      dayOfWeek: z.number().min(1).max(7).describe("Día de la semana: 1=Lunes, 2=Martes, ..., 7=Domingo").optional(),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).describe("Hora de inicio sugerida (HH:mm)").optional(),
      endTime: z.string().regex(/^\d{2}:\d{2}$/).describe("Hora de fin sugerida (HH:mm)").optional(),
    })
  ),
  balanceScore: z.number().min(0).max(100).describe("Puntuación de equidad 0-100"),
  notes: z.array(z.string()).describe("Notas sobre la distribución"),
});

export type AIPlanResult = z.infer<typeof assignmentSchema> & {
  excludedTasks?: ExcludedTask[];
};

interface PlanContext {
  householdId: string;
  members: Array<{
    id: string;
    name: string;
    type: string;
    pendingCount: number;
    completedThisWeek: number;
    level: number;
    preferences: Array<{ taskName: string; preference: string }>;
    availability?: { weekday: string[]; weekend: string[]; notes?: string } | null;
  }>;
  tasks: Array<{
    id: string;
    name: string;
    frequency: string;
    weight: number;
    minAge: number | null;
    estimatedMinutes: number | null;
  }>;
  recentAssignments: Array<{
    taskName: string;
    memberName: string;
    status: string;
    daysAgo: number;
  }>;
  recentFeedback: Array<{
    memberName: string;
    rating: number;
    comment: string | null;
    planDate: string;
  }>;
}

interface GeneratePlanOptions {
  durationDays?: number;
}

/**
 * Generate a task distribution plan using AI.
 * Considers member preferences, capacity, recent history, and fairness.
 * Tasks whose frequency exceeds the plan duration are excluded.
 */
export async function generateAIPlan(
  householdId: string,
  options?: GeneratePlanOptions
): Promise<AIPlanResult | null> {
  if (!isAIEnabled()) {
    return null;
  }

  const durationDays = options?.durationDays ?? 7;
  const [context, household] = await Promise.all([
    buildPlanContext(householdId),
    prisma.household.findUnique({
      where: { id: householdId },
      select: { latitude: true, longitude: true, timezone: true, country: true, city: true },
    }),
  ]);
  const regionalContext = await buildRegionalContext(household ?? {});

  if (context.members.length === 0 || context.tasks.length === 0) {
    return null;
  }

  // Partition tasks by plan duration
  const { included, excluded } = partitionTasksByDuration(
    context.tasks.map((t) => ({
      ...t,
      frequency: t.frequency as TaskFrequency,
    })),
    durationDays
  );

  if (included.length === 0) {
    return null;
  }

  // Replace context tasks with only included ones
  const filteredContext: PlanContext = { ...context, tasks: included };

  const excludedTasks: ExcludedTask[] = excluded.map((t) => ({
    taskName: t.name,
    frequency: t.frequency as TaskFrequency,
  }));

  const providerType = getAIProviderType();

  // Use OpenRouter SDK if configured
  if (providerType === "openrouter") {
    try {
      const result = await generateAIPlanOpenRouter({
        members: filteredContext.members.map((m) => ({
          id: m.id,
          name: m.name,
          type: m.type,
          pendingCount: m.pendingCount,
          availability: m.availability,
        })),
        tasks: filteredContext.tasks.map((t) => ({
          name: t.name,
          frequency: t.frequency,
          weight: t.weight,
        })),
        durationDays,
        regionalBlock: regionalContext.promptBlock,
        feedbackBlock: buildFeedbackBlock(filteredContext.recentFeedback),
      });
      if (result) {
        return { ...result, excludedTasks };
      }
      return null;
    } catch (error) {
      console.error("OpenRouter AI plan generation error:", error);
      return null;
    }
  }

  // Use Vercel AI SDK for Gemini/Anthropic
  const model = getModel();
  if (!model) {
    return null;
  }

  const prompt = buildPlanPrompt(filteredContext, durationDays, regionalContext.promptBlock);

  try {
    const result = await generateObject({
      model,
      schema: assignmentSchema,
      prompt,
      maxOutputTokens: 8192,
    });

    return { ...result.object, excludedTasks };
  } catch (error) {
    console.error("AI plan generation error:", error);
    return null;
  }
}

/**
 * Generate AND apply a task distribution plan.
 * Creates actual assignments in the database.
 */
export async function generateAndApplyPlan(householdId: string): Promise<{
  success: boolean;
  assignmentsCreated: number;
  plan: AIPlanResult | null;
  error?: string;
}> {
  const plan = await generateAIPlan(householdId);

  if (!plan) {
    // Fall back to deterministic algorithm
    return {
      success: false,
      assignmentsCreated: 0,
      plan: null,
      error: "AI planning not available, use fallback algorithm",
    };
  }

  // Get members and tasks for ID lookup
  const [members, tasks] = await Promise.all([
    prisma.member.findMany({
      where: { householdId, isActive: true },
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: { householdId, isActive: true },
      select: { id: true, name: true, frequency: true },
    }),
  ]);

  const memberIdSet = new Set(members.map((m) => m.id));
  const taskMap = new Map(tasks.map((t) => [t.name.toLowerCase(), { id: t.id, frequency: t.frequency }]));

  const now = new Date();

  // Batch existence check: 1 query instead of N per assignment
  const allTaskIds = [...new Set(
    plan.assignments
      .map((a) => taskMap.get(a.taskName.toLowerCase())?.id)
      .filter((id): id is string => id != null)
  )];
  const existingAssignments = allTaskIds.length > 0
    ? await prisma.assignment.findMany({
        where: {
          taskId: { in: allTaskIds },
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        select: { taskId: true, memberId: true },
      })
    : [];
  const existingSet = new Set(existingAssignments.map((a) => `${a.taskId}:${a.memberId}`));

  const assignmentsToCreate: Array<{
    taskId: string;
    memberId: string;
    householdId: string;
    dueDate: Date;
    status: "PENDING";
  }> = [];

  for (const assignment of plan.assignments) {
    const memberId = memberIdSet.has(assignment.memberId) ? assignment.memberId : undefined;
    const taskInfo = taskMap.get(assignment.taskName.toLowerCase());

    if (memberId && taskInfo) {
      if (!existingSet.has(`${taskInfo.id}:${memberId}`)) {
        const dueDate = computeDueDateForFrequency(taskInfo.frequency as TaskFrequency, now);
        assignmentsToCreate.push({
          taskId: taskInfo.id,
          memberId,
          householdId,
          dueDate,
          status: "PENDING",
        });
      }
    }
  }

  if (assignmentsToCreate.length > 0) {
    await prisma.assignment.createMany({
      data: assignmentsToCreate,
    });
  }

  return {
    success: true,
    assignmentsCreated: assignmentsToCreate.length,
    plan,
  };
}

async function buildPlanContext(householdId: string): Promise<PlanContext> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [members, tasks, recentAssignments, preferences, completedThisWeek, feedbackRows] = await Promise.all([
    prisma.member.findMany({
      where: { householdId, isActive: true },
      include: {
        level: true,
        assignments: {
          where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
          select: { id: true },
        },
      },
    }),
    prisma.task.findMany({
      where: { householdId, isActive: true },
      select: { id: true, name: true, frequency: true, weight: true, minAge: true, estimatedMinutes: true },
    }),
    prisma.assignment.findMany({
      where: { householdId },
      take: 50,
      orderBy: { updatedAt: "desc" },
      include: {
        task: { select: { name: true } },
        member: { select: { name: true } },
      },
    }),
    prisma.memberPreference.findMany({
      where: { member: { householdId } },
      include: {
        task: { select: { name: true } },
        member: { select: { name: true } },
      },
    }),
    prisma.assignment.groupBy({
      by: ["memberId"],
      where: {
        householdId,
        status: { in: ["COMPLETED", "VERIFIED"] },
        completedAt: { gte: startOfWeek },
      },
      _count: { id: true },
    }),
    prisma.planFeedback.findMany({
      where: { householdId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        member: { select: { name: true } },
        plan: { select: { createdAt: true } },
      },
    }),
  ]);

  const completedMap = new Map(completedThisWeek.map((c) => [c.memberId, c._count.id]));
  const prefsByMember = new Map<string, Array<{ taskName: string; preference: string }>>();

  for (const pref of preferences) {
    const memberPrefs = prefsByMember.get(pref.member.name) ?? [];
    memberPrefs.push({
      taskName: pref.task.name,
      preference: pref.preference,
    });
    prefsByMember.set(pref.member.name, memberPrefs);
  }

  return {
    householdId,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.memberType,
      pendingCount: m.assignments.length,
      completedThisWeek: completedMap.get(m.id) ?? 0,
      level: m.level?.level ?? 1,
      preferences: prefsByMember.get(m.name) ?? [],
      availability: m.availabilitySlots as { weekday: string[]; weekend: string[]; notes?: string } | null,
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      name: t.name,
      frequency: t.frequency,
      weight: t.weight,
      minAge: t.minAge,
      estimatedMinutes: t.estimatedMinutes,
    })),
    recentAssignments: recentAssignments.map((a) => {
      const daysAgo = Math.floor((now.getTime() - a.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        taskName: a.task.name,
        memberName: a.member.name,
        status: a.status,
        daysAgo,
      };
    }),
    recentFeedback: feedbackRows.map((f) => ({
      memberName: f.member.name,
      rating: f.rating,
      comment: f.comment,
      planDate: f.plan.createdAt.toLocaleDateString("es-AR", { day: "numeric", month: "short" }),
    })),
  };
}

function buildPlanPrompt(context: PlanContext, durationDays = 7, regionalBlock = ""): string {
  const capacityRules = `
Capacidad por tipo de miembro:
- ADULT: 100% de capacidad
- TEEN: 60% de capacidad
- CHILD: 30% de capacidad`;

  const membersInfo = context.members
    .map((m) => {
      let info = `- [ID: ${m.id}] ${m.name} (${m.type}, nivel ${m.level}): ${m.pendingCount} tareas pendientes, ${m.completedThisWeek} completadas esta semana`;
      if (m.preferences.length > 0) {
        const prefs = m.preferences
          .map((p) => `${p.taskName}: ${p.preference === "PREFERRED" ? "prefiere" : "no desea"}`)
          .join(", ");
        info += `\n  Preferencias: ${prefs}`;
      }
      if (m.availability) {
        const slotLabels: Record<string, string> = { MORNING: "mañanas (7-12)", AFTERNOON: "tardes (12-18)", NIGHT: "noches (18-22)" };
        const weekdaySlots = m.availability.weekday.map((s) => slotLabels[s]).filter(Boolean).join(", ");
        const weekendSlots = m.availability.weekend.map((s) => slotLabels[s]).filter(Boolean).join(", ");
        if (weekdaySlots) info += `\n  Disponible L-V: ${weekdaySlots}`;
        if (weekendSlots) info += `\n  Disponible S-D: ${weekendSlots}`;
        if (m.availability.notes) info += `\n  Nota: "${m.availability.notes}"`;
      }
      return info;
    })
    .join("\n");

  const tasksInfo = context.tasks
    .map((t) => `- ${t.name} (${t.frequency}, peso ${t.weight}, ~${t.estimatedMinutes ?? 30}min)${t.minAge ? ` [edad mín: ${t.minAge}]` : ""}`)
    .join("\n");

  const recentInfo = context.recentAssignments
    .slice(0, 20)
    .map((a) => `- ${a.taskName} → ${a.memberName} (${a.status}, hace ${a.daysAgo} días)`)
    .join("\n");

  return `Eres un planificador de tareas del hogar. Tu objetivo es distribuir las tareas de forma EQUITATIVA y JUSTA entre los miembros.

${capacityRules}

## Miembros del hogar
${membersInfo}

## Tareas disponibles
${tasksInfo}

## Historial reciente de asignaciones
${recentInfo || "(sin historial)"}

## Instrucciones
1. Asigna TODAS las tareas activas a los miembros
2. Respeta las preferencias cuando sea posible (pero no obligatorio)
3. Balancea la carga considerando la capacidad de cada tipo de miembro
4. Rota las tareas - no siempre la misma persona para la misma tarea
5. Si alguien tiene muchas tareas pendientes, asignarle menos nuevas
6. Los niños (CHILD) no deben recibir tareas complejas o peligrosas
7. Proporciona una breve razón para cada asignación
8. IMPORTANTE: Usa el ID exacto del miembro (campo "memberId") tal como aparece entre [ID: ...] en la lista de miembros. Dos miembros pueden tener el mismo nombre, así que el ID es la forma correcta de identificarlos.
9. DISTRIBUYE las tareas en los DÍAS DE LA SEMANA usando el campo "dayOfWeek" (1=Lunes, 2=Martes, ..., 7=Domingo). El plan cubre ${durationDays} días.
   - Tareas DAILY: genera EXACTAMENTE ${Math.min(durationDays, 7)} asignaciones (una por cada día, dayOfWeek 1 a ${Math.min(durationDays, 7)}). Puedes rotar miembros distintos en distintos días.
   - Tareas WEEKLY: genera UNA sola asignación.
   - Tareas BIWEEKLY: genera UNA sola asignación.
   - Tareas ONCE: genera UNA sola asignación.
   - Balancea la carga diaria.
10. Para cada tarea, sugiere un RANGO HORARIO razonable usando "startTime" y "endTime" (formato "HH:mm").
   - RESPETA la disponibilidad horaria de cada miembro. Solo asigna tareas en los bloques donde el miembro indicó estar disponible.
   - Si un miembro no tiene disponibilidad configurada, distribuye razonablemente pero NO llenes todo el día.
   - Agrupa tareas consecutivas en bloques compactos (ej: 2 tareas de 15min juntas de 18:00 a 18:30, no separadas por horas).
   - No asignes más de 60-90 minutos de tareas por día por persona salvo que sea estrictamente necesario.
   - Dejá tiempo libre, especialmente los fines de semana. Las tareas deben sentirse manejables, no una jornada laboral.
   - No asignes tareas a niños (CHILD) en horarios de madrugada o noche.
   - Si un miembro tiene una nota de disponibilidad, respetala.
   - Ejemplo: "startTime": "18:00", "endTime": "18:30"

Genera un plan de asignaciones para los próximos ${durationLabel(durationDays)}. El objetivo es maximizar la equidad (balanceScore alto = más justo).${regionalBlock ? `\n\n${regionalBlock}` : ""}${buildFeedbackBlock(context.recentFeedback)}`;
}

function buildFeedbackBlock(
  feedback: PlanContext["recentFeedback"],
): string {
  if (feedback.length === 0) return "";

  const lines = feedback.map((f) => {
    const commentPart = f.comment ? `: "${f.comment}"` : "";
    return `- ${f.memberName} valoró ${f.rating}/5${commentPart} (plan del ${f.planDate})`;
  });

  return `\n\n## Feedback de planes anteriores
Los miembros dieron esta retroalimentación sobre distribuciones previas:
${lines.join("\n")}
Tené en cuenta este feedback al distribuir las tareas. Si hay quejas, ajustá la distribución. Si hay comentarios positivos, mantené ese enfoque.`;
}
