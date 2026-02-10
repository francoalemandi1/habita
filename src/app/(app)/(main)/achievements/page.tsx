import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Trophy, Lock, Sparkles } from "lucide-react";
import { spacing, iconSize } from "@/lib/design-tokens";

export default async function AchievementsPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const [allAchievements, memberAchievements] = await Promise.all([
    prisma.achievement.findMany({
      orderBy: { xpReward: "asc" },
    }),
    prisma.memberAchievement.findMany({
      where: { memberId: member.id },
      select: { achievementId: true, unlockedAt: true },
    }),
  ]);

  const unlockedMap = new Map(
    memberAchievements.map((ma) => [ma.achievementId, ma.unlockedAt])
  );

  const achievements = allAchievements.map((a) => ({
    ...a,
    isUnlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id) ?? null,
  }));

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalXpFromAchievements = achievements
    .filter((a) => a.isUnlocked)
    .reduce((sum, a) => sum + a.xpReward, 0);

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <div className={spacing.pageHeader}>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <Trophy className={`${iconSize.xl} text-yellow-500`} />
          Logros
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {unlockedCount} de {achievements.length} desbloqueados
          {totalXpFromAchievements > 0 && ` · +${totalXpFromAchievements} XP ganados`}
        </p>
      </div>

      {/* Progress bar */}
      <div className={spacing.sectionGapLg}>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-yellow-500 transition-all"
            style={{ width: `${achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Achievement grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`relative rounded-2xl p-4 transition-colors ${
              achievement.isUnlocked
                ? "bg-brand-cream"
                : "bg-muted/30 opacity-60"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                  achievement.isUnlocked
                    ? "bg-yellow-500/20"
                    : "bg-muted"
                }`}
              >
                {achievement.isUnlocked ? (
                  <Sparkles className={`${iconSize.lg} text-yellow-600`} />
                ) : (
                  <Lock className={`${iconSize.md} text-muted-foreground`} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${achievement.isUnlocked ? "text-foreground" : "text-muted-foreground"}`}>
                  {achievement.name}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {achievement.description}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-xs">
                  <span className="font-medium text-[var(--color-xp)]">
                    +{achievement.xpReward} XP
                  </span>
                  {achievement.unlockedAt && (
                    <span className="text-muted-foreground">
                      {new Date(achievement.unlockedAt).toLocaleDateString("es", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {achievements.length === 0 && (
        <div className="rounded-2xl bg-muted/30 py-12 text-center">
          <Trophy className="mx-auto mb-4 size-12 text-muted-foreground" />
          <p className="text-lg font-medium">Sin logros disponibles</p>
          <p className="text-sm text-muted-foreground">
            Los logros se desbloquean completando tareas
          </p>
        </div>
      )}
    </div>
  );
}
