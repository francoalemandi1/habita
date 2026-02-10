import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { KidsTaskList } from "@/components/features/kids-task-list";
import { KidsProgressCard } from "@/components/features/kids-progress-card";
import { spacing } from "@/lib/design-tokens";

export default async function KidsPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [assignments, completedToday, recentAchievements] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        memberId: member.id,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lte: endOfToday },
      },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            description: true,
            weight: true,
            estimatedMinutes: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.assignment.count({
      where: {
        memberId: member.id,
        status: { in: ["COMPLETED", "VERIFIED"] },
        completedAt: { gte: todayStart },
      },
    }),
    prisma.memberAchievement.findMany({
      where: { memberId: member.id },
      include: {
        achievement: {
          select: { name: true, iconUrl: true },
        },
      },
      orderBy: { unlockedAt: "desc" },
      take: 3,
    }),
  ]);

  // Get level info
  const level = member.level;
  const currentXp = level?.xp ?? 0;
  const currentLevel = level?.level ?? 1;
  const xpForNextLevel = currentLevel * 100;
  const xpProgress = currentXp % 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
      <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
        {/* Header */}
        <div className={`${spacing.pageHeader} text-center`}>
          <h1 className="text-4xl font-bold text-primary">
            ¡Hola, {member.name}! 👋
          </h1>
          <p className="mt-2 text-xl text-muted-foreground">
            {assignments.length === 0
              ? "¡No tienes tareas pendientes!"
              : `Tienes ${assignments.length} tarea${assignments.length > 1 ? "s" : ""} por hacer`}
          </p>
        </div>

        {/* Progress Card */}
        <div className={spacing.sectionGapLg}>
          <KidsProgressCard
            level={currentLevel}
            xpProgress={xpProgress}
            xpForNextLevel={100}
            completedToday={completedToday}
            recentAchievements={recentAchievements.map((a) => ({
              name: a.achievement.name,
              iconUrl: a.achievement.iconUrl,
            }))}
          />
        </div>

        {/* Tasks */}
        <KidsTaskList assignments={assignments} />
      </div>
    </div>
  );
}
