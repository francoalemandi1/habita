import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember, getCurrentUserMembers } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { levelProgress } from "@/lib/points";
import { calculateStreak } from "@/lib/achievements";
import { PENALTY_DESCRIPTIONS } from "@/lib/validations/penalty";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PenaltiesSection } from "@/components/features/penalties-section";
import { ProfileSettings } from "@/components/features/profile-settings";
import { Trophy, Star, Zap, Plus, Flame } from "lucide-react";

import type { PenaltyReason } from "@/lib/validations/penalty";

export default async function ProfilePage() {
  const [member, allMembers] = await Promise.all([
    getCurrentMember(),
    getCurrentUserMembers(),
  ]);

  if (!member) {
    redirect("/onboarding");
  }

  // Get household members
  const householdMembers = await prisma.member.findMany({
    where: { householdId: member.householdId, isActive: true },
    select: { id: true, name: true, memberType: true, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  // Get achievements
  const memberAchievements = await prisma.memberAchievement.findMany({
    where: { memberId: member.id },
    include: { achievement: true },
    orderBy: { unlockedAt: "desc" },
  });

  // Get stats
  const completedTasks = await prisma.assignment.count({
    where: {
      memberId: member.id,
      status: { in: ["COMPLETED", "VERIFIED"] },
    },
  });

  const totalPoints = await prisma.assignment.aggregate({
    where: {
      memberId: member.id,
      status: { in: ["COMPLETED", "VERIFIED"] },
    },
    _sum: { pointsEarned: true },
  });

  // Get penalties
  const penalties = await prisma.penalty.findMany({
    where: { memberId: member.id },
    include: {
      assignment: {
        select: {
          id: true,
          task: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const enrichedPenalties = penalties.map((p) => ({
    ...p,
    reasonDescription: PENALTY_DESCRIPTIONS[p.reason as PenaltyReason],
  }));

  const totalPenaltyPoints = penalties.reduce((sum, p) => sum + p.points, 0);

  // Get current streak
  const currentStreak = await calculateStreak(member.id);

  const level = member.level?.level ?? 1;
  const xp = member.level?.xp ?? 0;
  const progress = levelProgress(xp, level);

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{member.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{member.household.name}</p>
        </div>
        <Button variant="outline" asChild className="w-fit">
          <Link href="/onboarding?mode=join" className="gap-2">
            <Plus className="h-4 w-4" />
            Unirse a otro hogar
          </Link>
        </Button>
      </div>

      {/* Settings */}
      <div className="mb-8">
        <ProfileSettings
          memberName={member.name}
          householdName={member.household.name}
          inviteCode={member.household.inviteCode}
          members={householdMembers}
          isAdult={member.memberType === "ADULT"}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Level Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-[var(--color-level)]" />
              Nivel {level}
            </CardTitle>
            <CardDescription>{xp} XP total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso al nivel {level + 1}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                {100 - (xp % 100)} XP para el siguiente nivel
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Estadísticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="flex items-center gap-1 text-muted-foreground">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Racha actual
                </dt>
                <dd className="font-medium">
                  {currentStreak} {currentStreak === 1 ? "día" : "días"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tareas completadas</dt>
                <dd className="font-medium">{completedTasks}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Puntos ganados</dt>
                <dd className="font-medium">{totalPoints._sum.pointsEarned ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Logros desbloqueados</dt>
                <dd className="font-medium">{memberAchievements.length}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Member Type Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Tipo de miembro</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-lg">
              {member.memberType === "ADULT"
                ? "Adulto"
                : member.memberType === "TEEN"
                  ? "Adolescente"
                  : "Niño"}
            </Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              Capacidad:{" "}
              {member.memberType === "ADULT"
                ? "100%"
                : member.memberType === "TEEN"
                  ? "60%"
                  : "30%"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <div className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Logros ({memberAchievements.length})
        </h2>
        {memberAchievements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Aún no has desbloqueado ningún logro. ¡Completa tareas para conseguirlos!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {memberAchievements.map((ma) => (
              <Card key={ma.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{ma.achievement.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {ma.achievement.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="outline">+{ma.achievement.xpReward} XP</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ma.unlockedAt).toLocaleDateString("es")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Penalties */}
      <div className="mt-8">
        <PenaltiesSection
          penalties={enrichedPenalties}
          stats={{
            totalPenalties: penalties.length,
            totalPenaltyPoints,
          }}
        />
      </div>
    </div>
  );
}
