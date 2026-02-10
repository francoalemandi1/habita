import { redirect } from "next/navigation";
import { getCurrentMember, getCurrentUserMembers } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { levelProgress } from "@/lib/points";
import { ProfileSettings } from "@/components/features/profile-settings";
import { SignOutButton } from "@/components/features/sign-out-button";
import { ChevronRight } from "lucide-react";
import { statCardColors, spacing, iconSize, radius } from "@/lib/design-tokens";
import Link from "next/link";

export default async function ProfilePage() {
  const [member, allMembers] = await Promise.all([
    getCurrentMember(),
    getCurrentUserMembers(),
  ]);

  if (!member) {
    redirect("/onboarding");
  }

  const [householdMembers, completedTasks, totalPoints] = await Promise.all([
    prisma.member.findMany({
      where: { householdId: member.householdId, isActive: true },
      select: { id: true, name: true, memberType: true, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.assignment.count({
      where: {
        memberId: member.id,
        status: { in: ["COMPLETED", "VERIFIED"] },
      },
    }),
    prisma.assignment.aggregate({
      where: {
        memberId: member.id,
        status: { in: ["COMPLETED", "VERIFIED"] },
      },
      _sum: { pointsEarned: true },
    }),
  ]);

  const level = member.level?.level ?? 1;
  const xp = member.level?.xp ?? 0;
  const progress = levelProgress(xp, level);
  const points = totalPoints._sum.pointsEarned ?? 0;

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      {/* Header */}
      <h1 className={`${spacing.pageHeader} text-2xl font-bold tracking-tight text-foreground sm:text-3xl`}>
        Mi Perfil
      </h1>

      {/* Score + Stats: two columns on desktop */}
      <div className={`${spacing.sectionGapLg} grid gap-6 md:grid-cols-2`}>
        <div className={`relative flex h-[164px] flex-col justify-between overflow-hidden ${radius.cardCompact} ${statCardColors.primary.bg} p-5`}>
          <p className="text-sm font-medium text-white/80">Puntaje Total</p>
          <p className="self-end text-8xl font-bold leading-none text-white">
            {points}
          </p>
        </div>
        <div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">Estadísticas</h2>
          <div className="flex gap-2">
            <div className={`flex h-[130px] flex-1 flex-col justify-between ${radius.cardCompact} ${statCardColors.purple.bg} p-4`}>
              <p className={`text-xs font-semibold ${statCardColors.purple.text}`}>Completadas</p>
              <p className={`text-4xl font-bold ${statCardColors.purple.text}`}>{completedTasks}</p>
            </div>
            <div className={`flex h-[130px] flex-1 flex-col justify-between ${radius.cardCompact} ${statCardColors.orange.bg} p-4`}>
              <p className="text-xs font-semibold text-brand-peach">Progreso</p>
              <p className="text-4xl font-bold text-white">{progress}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mi Hogar Section */}
      <div className={spacing.sectionGap}>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Mi Hogar</h2>
        <Link
          href="/dashboard"
          className="flex items-center justify-between gap-2 rounded-2xl bg-white p-4 shadow-sm"
        >
          <span className="min-w-0 truncate font-medium text-foreground">{member.household.name}</span>
          <ChevronRight className={`${iconSize.lg} shrink-0 text-primary`} />
        </Link>
      </div>

      {/* Settings (edit name, household, invite code, members list) */}
      <div className={spacing.sectionGap}>
        <ProfileSettings
          memberName={member.name}
          householdName={member.household.name}
          inviteCode={member.household.inviteCode}
          members={householdMembers}
          isAdult={member.memberType === "ADULT"}
          planningDay={member.household.planningDay}
          location={{
            timezone: member.household.timezone,
            country: member.household.country,
            city: member.household.city,
          }}
        />
      </div>

      {/* Sign Out */}
      <SignOutButton />
    </div>
  );
}
