import { prisma } from "@/lib/prisma";
import { buildRegionalContext } from "./regional-context";

const DATE_FMT = { year: "numeric", month: "2-digit", day: "2-digit" } as const;

/**
 * Construye el contexto del hogar para el prompt del asistente (spec §4.2).
 */
export async function buildAssistantContext(householdId: string, currentMemberName: string) {
  // Fetch members with level + pending count, plus household location for regional context
  const [membersWithStats, tasks, recentAssignments, household] = await Promise.all([
    prisma.member.findMany({
      where: { householdId, isActive: true },
      select: {
        id: true,
        name: true,
        memberType: true,
        level: { select: { level: true } },
        assignments: {
          where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { householdId, isActive: true },
      select: { id: true, name: true, frequency: true, weight: true },
      orderBy: { name: "asc" },
    }),
    prisma.assignment.findMany({
      where: { householdId },
      take: 20,
      orderBy: { updatedAt: "desc" },
      include: {
        task: { select: { name: true } },
        member: { select: { name: true } },
      },
    }),
    prisma.household.findUnique({
      where: { id: householdId },
      select: { latitude: true, longitude: true, timezone: true, country: true, city: true },
    }),
  ]);

  const regionalContext = await buildRegionalContext(household ?? {});

  const members = membersWithStats.map((m) => ({ id: m.id, name: m.name, memberType: m.memberType }));
  const memberStats = await getMemberStatsThisWeek(householdId, membersWithStats);

  const membersText = members
    .map((m) => `- ${m.name} (${m.memberType})`)
    .join("\n");
  const tasksText = tasks
    .map((t) => `- ${t.name} | ${t.frequency} | peso ${t.weight}`)
    .join("\n");
  const recentText = recentAssignments
    .map(
      (a) =>
        `- ${a.task.name} → ${a.member.name} | ${a.status} | vence ${new Date(a.dueDate).toLocaleDateString("es-ES", DATE_FMT)}${a.completedAt ? ` | completado ${new Date(a.completedAt).toLocaleDateString("es-ES", DATE_FMT)}` : ""}`
    )
    .join("\n");
  const statsText = memberStats
    .map(
      (s) =>
        `- ${s.memberName}: completadas esta semana ${s.completedThisWeek}, pendientes ${s.pending}, nivel ${s.level}`
    )
    .join("\n");

  return {
    currentUser: currentMemberName,
    members: membersText || "(ninguno)",
    tasks: tasksText || "(ninguna)",
    recentActivity: recentText || "(ninguna)",
    memberStats: statsText || "(sin datos)",
    regionalBlock: regionalContext.promptBlock,
  };
}

async function getMemberStatsThisWeek(
  householdId: string,
  members: Array<{ id: string; name: string; level: { level: number } | null; assignments: { id: string }[] }>
): Promise<Array<{ memberName: string; completedThisWeek: number; pending: number; level: number }>> {
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Only query needed: completions groupBy (members already fetched by caller)
  const completedThisWeek = await prisma.assignment.groupBy({
    by: ["memberId"],
    where: {
      householdId,
      status: { in: ["COMPLETED", "VERIFIED"] },
      completedAt: { gte: startOfWeek },
    },
    _count: { id: true },
  });
  const completedMap = new Map(
    completedThisWeek.map((c) => [c.memberId, c._count.id])
  );

  return members.map((m) => ({
    memberName: m.name,
    completedThisWeek: completedMap.get(m.id) ?? 0,
    pending: m.assignments.length,
    level: m.level?.level ?? 1,
  }));
}
