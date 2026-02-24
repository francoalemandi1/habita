import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeDueDateForFrequency } from "@/lib/due-date";
import { partitionTasksByDuration, durationLabel } from "@/lib/plan-duration";
import { isAIEnabled, getAIProviderType } from "./provider";
import { getDeepSeekModel } from "./deepseek-provider";
import { buildRegionalContext } from "./regional-context";

import type { TaskFrequency } from "@prisma/client";
import type { LanguageModel } from "ai";
import type { ExcludedTask } from "@/lib/plan-duration";

function getModel(): LanguageModel {
  const providerType = getAIProviderType();

  if (providerType === "gemini") {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return google("gemini-1.5-flash");
  }

  return getDeepSeekModel();
}

const assignmentSchema = z.object({
  assignments: z.array(
    z.object({
      taskName: z.string(),
      memberId: z.string().describe("ID del miembro (tal como aparece en la lista de miembros)"),
      memberName: z.string().describe("Nombre del miembro (para referencia)"),
      reason: z.string().describe("Breve justificación de la asignación"),
      dayOfWeek: z.number().min(1).max(7).describe("Día de la semana: 1=Lunes, 2=Martes, ..., 7=Domingo").optional(),
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
    occupationLevel: string;
    preferences: Array<{ taskName: string; preference: string }>;
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

  const model = getModel();
  const isSolo = filteredContext.members.length === 1;
  const prompt = isSolo
    ? buildSoloPlanPrompt(filteredContext, durationDays, regionalContext.promptBlock)
    : buildPlanPrompt(filteredContext, durationDays, regionalContext.promptBlock);

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
      occupationLevel: m.occupationLevel,
      preferences: prefsByMember.get(m.name) ?? [],
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

  const occupationLabels: Record<string, string> = {
    BUSY: "Muy ocupado/a (poco tiempo en casa)",
    MODERATE: "Ocupado/a (disponibilidad moderada)",
    AVAILABLE: "Disponible (más tiempo en casa)",
  };

  const membersInfo = context.members
    .map((m) => {
      let info = `- [ID: ${m.id}] ${m.name} (${m.type}, ${occupationLabels[m.occupationLevel] ?? "Ocupado/a"}): ${m.pendingCount} tareas pendientes, ${m.completedThisWeek} completadas esta semana`;
      if (m.preferences.length > 0) {
        const prefs = m.preferences
          .map((p) => `${p.taskName}: ${p.preference === "PREFERRED" ? "prefiere" : "no desea"}`)
          .join(", ");
        info += `\n  Preferencias: ${prefs}`;
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
10. Considerá el nivel de ocupación de cada miembro al distribuir la carga:
   - "Muy ocupado/a": asignar MENOS tareas y las más livianas
   - "Ocupado/a": carga moderada
   - "Disponible": puede asumir más tareas o las más pesadas
   - Las tareas son una GUÍA organizativa, no una obligación con horario

Genera un plan de asignaciones para los próximos ${durationLabel(durationDays)}. El objetivo es maximizar la equidad (balanceScore alto = más justo).${regionalBlock ? `\n\n${regionalBlock}` : ""}${buildFeedbackBlock(context.recentFeedback)}`;
}

function buildSoloPlanPrompt(context: PlanContext, durationDays = 7, regionalBlock = ""): string {
  const member = context.members[0]!;

  const occupationLabels: Record<string, string> = {
    BUSY: "Muy ocupado/a",
    MODERATE: "Ocupado/a",
    AVAILABLE: "Disponible",
  };

  const memberInfo = `- [ID: ${member.id}] ${member.name} (${occupationLabels[member.occupationLevel] ?? "Ocupado/a"}): ${member.pendingCount} tareas pendientes, ${member.completedThisWeek} completadas esta semana`;

  const tasksInfo = context.tasks
    .map((t) => `- ${t.name} (${t.frequency}, peso ${t.weight}, ~${t.estimatedMinutes ?? 30}min)`)
    .join("\n");

  const recentInfo = context.recentAssignments
    .slice(0, 20)
    .map((a) => `- ${a.taskName} (${a.status}, hace ${a.daysAgo} días)`)
    .join("\n");

  return `Eres un planificador de tareas del hogar para una persona que vive sola. Tu objetivo es organizar las tareas de forma eficiente en la semana como guía organizativa.

## Persona
${memberInfo}

## Tareas disponibles
${tasksInfo}

## Historial reciente
${recentInfo || "(sin historial)"}

## Instrucciones
1. Asigna TODAS las tareas activas a esta persona (usa siempre memberId: "${member.id}" y memberName: "${member.name}")
2. DISTRIBUYE las tareas en los DÍAS DE LA SEMANA usando "dayOfWeek" (1=Lunes ... 7=Domingo). El plan cubre ${durationDays} días.
   - Tareas DAILY: genera ${Math.min(durationDays, 7)} asignaciones (una por día, dayOfWeek 1 a ${Math.min(durationDays, 7)})
   - Tareas WEEKLY, BIWEEKLY, ONCE: genera UNA sola asignación cada una
   - Balancea la carga diaria — no concentres todo en un día
3. Considerá el nivel de ocupación al distribuir la carga:
   - Si está "Muy ocupado/a": concentrar tareas en pocos días, priorizar las esenciales
   - Si está "Disponible": distribuir más uniformemente
4. Priorizá tareas pesadas temprano en la semana
5. El "balanceScore" se interpreta como COBERTURA: % de tareas planificadas de forma razonable (100 = plan bien distribuido)
6. En las notas, incluí consejos de organización (no de distribución entre personas)
7. Proporciona una breve razón para cada asignación
8. Las tareas son una GUÍA organizativa, no una obligación — el tono debe ser positivo y flexible

Genera un plan para los próximos ${durationLabel(durationDays)}.${regionalBlock ? `\n\n${regionalBlock}` : ""}${buildFeedbackBlock(context.recentFeedback)}`;
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
