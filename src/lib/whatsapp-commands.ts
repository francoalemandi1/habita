import { prisma } from "./prisma";
import { calculatePointsWithBreakdown } from "./points";
import { checkAndUnlockAchievements } from "./achievements";
import { getBestAssignee } from "./assignment-algorithm";
import { computeDueDateForFrequency } from "./due-date";
import { createNotification, createNotificationForMembers } from "./notification-service";
import { calculatePlanPerformance, generateAIRewards } from "./llm/ai-reward-generator";
import { sendWhatsAppInteractive } from "./whatsapp";

import type { TaskFrequency } from "@prisma/client";

interface CommandContext {
  memberId: string;
  householdId: string;
  phoneNumber: string;
}

interface CommandResponse {
  text: string;
  /** If set, send interactive buttons instead of plain text */
  buttons?: Array<{ id: string; title: string }>;
}

/**
 * Handle an incoming WhatsApp message and return the response.
 */
export async function handleCommand(
  context: CommandContext,
  messageText: string
): Promise<CommandResponse> {
  const text = messageText.trim().toLowerCase();

  if (matchCommand(text, ["tareas", "mis tareas", "pendientes", "tarea"])) {
    return handleTareas(context);
  }

  const completarMatch = matchCompletarCommand(text);
  if (completarMatch !== null) {
    return handleCompletar(context, completarMatch);
  }

  if (matchCommand(text, ["puntos", "nivel", "xp", "perfil", "stats"])) {
    return handlePuntos(context);
  }

  if (matchCommand(text, ["ayuda", "help", "?", "hola", "hi", "menu"])) {
    return handleAyuda();
  }

  // Fuzzy match: check if input is close to a known command
  const suggestion = suggestCommand(text);
  if (suggestion) {
    return { text: `No reconozco "${messageText.trim()}". Quisiste decir "${suggestion}"?\n\nEscribí "ayuda" para ver los comandos.` };
  }

  return { text: `No reconozco ese comando.\n\nEscribí "ayuda" para ver lo que puedo hacer.` };
}

function matchCommand(text: string, aliases: string[]): boolean {
  return aliases.some((alias) => text === alias);
}

function matchCompletarCommand(text: string): number | null {
  const patterns = [
    /^(?:completar|hecho|listo|done|ok)\s+(\d+)$/,
    /^(\d+)$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

/** Suggest the closest command for typos. */
function suggestCommand(text: string): string | null {
  const commands: Record<string, string[]> = {
    tareas: ["tares", "tarras", "tars", "taera", "tareass"],
    puntos: ["punto", "puntoss", "putnos", "pts"],
    ayuda: ["auuda", "auyda", "ayud"],
  };

  for (const [command, typos] of Object.entries(commands)) {
    if (typos.some((t) => text === t) || text.startsWith(command.slice(0, 3))) {
      return command;
    }
  }
  return null;
}

// ============================================
// COMMAND HANDLERS
// ============================================

async function handleTareas(context: CommandContext): Promise<CommandResponse> {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const assignments = await prisma.assignment.findMany({
    where: {
      memberId: context.memberId,
      householdId: context.householdId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
      dueDate: { lte: endOfToday },
    },
    include: {
      task: { select: { name: true, weight: true, frequency: true, estimatedMinutes: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  if (assignments.length === 0) {
    return {
      text: "No tenés tareas pendientes para hoy. Buen trabajo!",
      buttons: [
        { id: "puntos", title: "Ver mis puntos" },
      ],
    };
  }

  const lines = assignments.map((a, i) => {
    const time = a.task.estimatedMinutes ? ` (~${a.task.estimatedMinutes}min)` : "";
    return `${i + 1}. ${a.task.name}${time}`;
  });

  // Use interactive buttons for the first 3 tasks
  const buttons = assignments.slice(0, 3).map((_, i) => ({
    id: `listo ${i + 1}`,
    title: `Completar ${i + 1}`,
  }));

  return {
    text: [
      `Tareas pendientes (${assignments.length}):`,
      "",
      ...lines,
    ].join("\n"),
    buttons,
  };
}

async function handleCompletar(
  context: CommandContext,
  taskNumber: number
): Promise<CommandResponse> {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const assignments = await prisma.assignment.findMany({
    where: {
      memberId: context.memberId,
      householdId: context.householdId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
      dueDate: { lte: endOfToday },
    },
    include: {
      task: { select: { id: true, name: true, weight: true, frequency: true } },
      member: { include: { level: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  if (assignments.length === 0) {
    return { text: "No tenés tareas pendientes para completar." };
  }

  const index = taskNumber - 1;
  const assignment = assignments[index];
  if (!assignment) {
    return {
      text: `Número inválido. Tenés ${assignments.length} tareas. Escribí "tareas" para verlas.`,
    };
  }

  const pointsBreakdown = calculatePointsWithBreakdown({
    weight: assignment.task.weight,
    frequency: assignment.task.frequency,
  });
  const points = pointsBreakdown.total;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.assignment.updateMany({
        where: {
          id: assignment.id,
          householdId: context.householdId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        data: {
          status: "COMPLETED",
          completedAt: now,
          pointsEarned: points,
        },
      });

      if (updated.count === 0) {
        throw new Error("ALREADY_COMPLETED");
      }

      const currentLevel = assignment.member.level;
      const newXp = (currentLevel?.xp ?? 0) + points;
      const newLevel = Math.floor(newXp / 100) + 1;

      if (currentLevel) {
        await tx.memberLevel.update({
          where: { id: currentLevel.id },
          data: { xp: newXp, level: newLevel },
        });
      } else {
        await tx.memberLevel.create({
          data: {
            memberId: context.memberId,
            xp: newXp,
            level: newLevel,
          },
        });
      }

      return {
        pointsEarned: points,
        newXp,
        newLevel,
        leveledUp: currentLevel ? newLevel > currentLevel.level : newLevel > 1,
      };
    });

    // Fire and forget side effects
    completeAssignmentSideEffects(assignment, result, context, now);

    const xpInLevel = result.newXp % 100;
    const levelUpLine = result.leveledUp
      ? `\nSubiste al nivel ${result.newLevel}!`
      : "";

    const remaining = assignments.length - 1;
    const remainingLine = remaining > 0
      ? `\n\n${remaining} tarea${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.`
      : "\n\nCompletaste todas las tareas de hoy!";

    const buttons = remaining > 0
      ? [{ id: "tareas", title: "Ver restantes" }]
      : [{ id: "puntos", title: "Ver mis puntos" }];

    return {
      text: [
        `Completaste "${assignment.task.name}"`,
        `+${result.pointsEarned} XP (Nivel ${result.newLevel} - ${xpInLevel}/100)${levelUpLine}${remainingLine}`,
      ].join("\n"),
      buttons,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_COMPLETED") {
      return { text: "Esa tarea ya fue completada." };
    }
    console.error("WhatsApp complete error:", error);
    return { text: "Error al completar la tarea. Intentá de nuevo." };
  }
}

/**
 * Side effects after completing an assignment (notifications, achievements, etc.)
 * Fire and forget — don't block the response.
 */
function completeAssignmentSideEffects(
  assignment: {
    id: string;
    taskId: string;
    memberId: string;
    task: { id: string; frequency: TaskFrequency };
  },
  result: {
    pointsEarned: number;
    newLevel: number;
    leveledUp: boolean;
  },
  context: CommandContext,
  now: Date
): void {
  (async () => {
    try {
      if (result.leveledUp) {
        await createNotification({
          memberId: context.memberId,
          type: "LEVEL_UP",
          title: "Subiste de nivel",
          message: `Alcanzaste el nivel ${result.newLevel}`,
          actionUrl: "/profile",
        });
      }

      const newAchievements = await checkAndUnlockAchievements(
        context.memberId,
        { ...assignment, completedAt: now }
      );

      for (const achievement of newAchievements) {
        await createNotification({
          memberId: context.memberId,
          type: "ACHIEVEMENT_UNLOCKED",
          title: "Logro desbloqueado",
          message: `${achievement.name} (+${achievement.xpReward} XP)`,
          actionUrl: "/achievements",
        });
      }

      // Competition score
      const activeCompetition = await prisma.competition.findFirst({
        where: { householdId: context.householdId, status: "ACTIVE" },
        select: { id: true },
      });

      if (activeCompetition) {
        await prisma.competitionScore.upsert({
          where: {
            competitionId_memberId: {
              competitionId: activeCompetition.id,
              memberId: context.memberId,
            },
          },
          update: {
            points: { increment: result.pointsEarned },
            tasksCompleted: { increment: 1 },
          },
          create: {
            competitionId: activeCompetition.id,
            memberId: context.memberId,
            points: result.pointsEarned,
            tasksCompleted: 1,
          },
        });
      }

      // Next assignment for recurring tasks
      if (assignment.task.frequency !== "ONCE") {
        const nextDue = computeDueDateForFrequency(
          assignment.task.frequency,
          now
        );
        const { best } = await getBestAssignee(
          context.householdId,
          assignment.taskId,
          nextDue
        );
        if (best) {
          await prisma.assignment.create({
            data: {
              taskId: assignment.taskId,
              memberId: best.memberId,
              householdId: context.householdId,
              dueDate: nextDue,
              status: "PENDING",
            },
          });
        }
      }

      // Auto-finalize plan
      const activePlan = await prisma.weeklyPlan.findFirst({
        where: { householdId: context.householdId, status: "APPLIED" },
        select: { id: true, createdAt: true, expiresAt: true, appliedAt: true },
      });

      if (activePlan) {
        const planStartDate = activePlan.appliedAt ?? activePlan.createdAt;
        const remainingCount = await prisma.assignment.count({
          where: {
            householdId: context.householdId,
            status: { in: ["PENDING", "IN_PROGRESS"] },
            createdAt: { gte: planStartDate },
          },
        });

        if (remainingCount === 0) {
          await prisma.weeklyPlan.update({
            where: { id: activePlan.id },
            data: { status: "COMPLETED" },
          });

          const householdMemberIds = await prisma.member.findMany({
            where: { householdId: context.householdId, isActive: true },
            select: { id: true },
          });
          await createNotificationForMembers(
            householdMemberIds.map((m) => m.id),
            {
              type: "PLAN_APPLIED",
              title: "Plan completado",
              message: "Todas las tareas del plan fueron completadas",
              actionUrl: "/plan",
            }
          );

          try {
            const performances = await calculatePlanPerformance(
              context.householdId,
              activePlan.createdAt,
              activePlan.expiresAt
            );
            const rewardResult = await generateAIRewards(
              context.householdId,
              activePlan.id,
              performances
            );
            if (rewardResult && rewardResult.rewards.length > 0) {
              const perfMap = new Map(
                performances.map((p) => [p.memberName.toLowerCase(), p])
              );
              const rewardsToCreate = rewardResult.rewards
                .map((r) => {
                  const perf = perfMap.get(r.memberName.toLowerCase());
                  if (!perf) return null;
                  return {
                    householdId: context.householdId,
                    name: r.rewardName,
                    description: r.rewardDescription,
                    pointsCost: r.pointsCost,
                    isAiGenerated: true,
                    planId: activePlan.id,
                    memberId: perf.memberId,
                    completionRate: perf.completionRate,
                  };
                })
                .filter((r): r is NonNullable<typeof r> => r !== null);
              if (rewardsToCreate.length > 0) {
                await prisma.householdReward.createMany({
                  data: rewardsToCreate,
                });
              }
            }
          } catch (err) {
            console.error("Error generating rewards (non-blocking):", err);
          }
        }
      }
    } catch (err) {
      console.error("WhatsApp complete side-effects error:", err);
    }
  })();
}

async function handlePuntos(context: CommandContext): Promise<CommandResponse> {
  const level = await prisma.memberLevel.findUnique({
    where: { memberId: context.memberId },
  });

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const completedToday = await prisma.assignment.count({
    where: {
      memberId: context.memberId,
      householdId: context.householdId,
      status: { in: ["COMPLETED", "VERIFIED"] },
      completedAt: { gte: startOfToday },
    },
  });

  const currentLevel = level?.level ?? 1;
  const currentXp = level?.xp ?? 0;
  const xpInLevel = currentXp % 100;

  return {
    text: [
      `Nivel ${currentLevel} (${xpInLevel}/100 XP)`,
      `Tareas completadas hoy: ${completedToday}`,
      `XP total: ${currentXp}`,
    ].join("\n"),
    buttons: [
      { id: "tareas", title: "Ver tareas" },
    ],
  };
}

function handleAyuda(): CommandResponse {
  return {
    text: [
      "Comandos disponibles:",
      "",
      "tareas - Ver tus tareas pendientes",
      "listo [N] - Completar tarea N",
      "puntos - Ver tu nivel y XP",
      "ayuda - Este mensaje",
    ].join("\n"),
  };
}
