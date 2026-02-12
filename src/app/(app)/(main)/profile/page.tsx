import { redirect } from "next/navigation";
import { getCurrentMember, getCurrentUserMembers } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProfileSettings } from "@/components/features/profile-settings";
import { SignOutButton } from "@/components/features/sign-out-button";
import { ChevronRight } from "lucide-react";
import { spacing, iconSize } from "@/lib/design-tokens";
import Link from "next/link";

export default async function ProfilePage() {
  const [member, allMembers] = await Promise.all([
    getCurrentMember(),
    getCurrentUserMembers(),
  ]);

  if (!member) {
    redirect("/onboarding");
  }

  const householdMembers = await prisma.member.findMany({
    where: { householdId: member.householdId, isActive: true },
    select: { id: true, name: true, memberType: true, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      {/* Header */}
      <h1 className={`${spacing.pageHeader} text-2xl font-bold tracking-tight text-foreground sm:text-3xl`}>
        Mi Perfil
      </h1>

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
