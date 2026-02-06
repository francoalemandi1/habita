import { redirect } from "next/navigation";
import { getCurrentMember, getCurrentUserMembers } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { levelProgress } from "@/lib/points";
import { calculateStreak } from "@/lib/achievements";
import { ProfileSettings } from "@/components/features/profile-settings";
import { SignOutButton } from "@/components/features/sign-out-button";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

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

  const currentStreak = await calculateStreak(member.id);

  const level = member.level?.level ?? 1;
  const xp = member.level?.xp ?? 0;
  const progress = levelProgress(xp, level);
  const points = totalPoints._sum.pointsEarned ?? 0;

  return (
    <div className="mx-auto max-w-md px-4 py-6 sm:py-8">
      {/* Header */}
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground">
        Mi Perfil
      </h1>

      {/* Score Card */}
      <div className="relative mb-6 flex h-[164px] flex-col justify-between overflow-hidden rounded-[10px] bg-[#5260fe] p-5">
        <p className="text-sm font-medium text-white/80">Puntaje Total</p>
        <p className="self-end text-8xl font-bold leading-none text-white">
          {points}
        </p>
      </div>

      {/* Stats Section */}
      <div className="mb-6">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Estadísticas</h2>
        <div className="flex gap-2">
          {/* Completadas */}
          <div className="flex h-[130px] flex-1 flex-col justify-between rounded-[10px] bg-[#d0b6ff] p-4">
            <p className="text-xs font-semibold text-[#522a97]">Completadas</p>
            <p className="text-4xl font-bold text-[#522a97]">{completedTasks}</p>
          </div>
          {/* Racha */}
          <div className="flex h-[130px] flex-1 flex-col justify-between rounded-[10px] bg-[#d2ffa0] p-4">
            <p className="text-xs font-semibold text-[#272727]">Racha</p>
            <p className="text-4xl font-bold text-[#272727]">{currentStreak}</p>
          </div>
          {/* Progreso */}
          <div className="flex h-[130px] flex-1 flex-col justify-between rounded-[10px] bg-[#fd7c52] p-4">
            <p className="text-xs font-semibold text-[#fed9cb]">Progreso</p>
            <p className="text-4xl font-bold text-white">{progress}%</p>
          </div>
        </div>
      </div>

      {/* Mi Hogar Section */}
      <div className="mb-6">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Mi Hogar</h2>
        <Link
          href="/dashboard"
          className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
        >
          <span className="font-medium text-foreground">{member.household.name}</span>
          <ChevronRight className="size-5 text-primary" />
        </Link>
      </div>

      {/* Settings (edit name, household, invite code, members list) */}
      <div className="mb-8">
        <ProfileSettings
          memberName={member.name}
          householdName={member.household.name}
          inviteCode={member.household.inviteCode}
          members={householdMembers}
          isAdult={member.memberType === "ADULT"}
        />
      </div>

      {/* Sign Out */}
      <SignOutButton />
    </div>
  );
}
