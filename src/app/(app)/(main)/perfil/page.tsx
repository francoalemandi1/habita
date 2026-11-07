import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { parseOnboardingProfile } from "@/lib/onboarding-profile";
import { ProfileHeader } from "@/components/features/perfil/profile-header";
import { HouseholdCard } from "@/components/features/perfil/household-card";
import { HouseholdSettingsRows } from "@/components/features/perfil/household-settings-rows";
import { MembersList } from "@/components/features/perfil/members-list";
import { InviteRow } from "@/components/features/perfil/invite-sheet";
import { SettingsRows } from "@/components/features/perfil/settings-rows";
import { AccountActions } from "@/components/features/perfil/account-actions";

export const metadata = {
  title: "Perfil",
};

export default async function PerfilPage(): Promise<React.JSX.Element> {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const [householdMembers, user] = await Promise.all([
    prisma.member.findMany({
      where: { householdId: member.householdId, isActive: true },
      select: { id: true, name: true, memberType: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUnique({ where: { id: member.userId }, select: { email: true } }),
  ]);

  const isAdult = member.memberType === "ADULT";
  const onboardingProfile = parseOnboardingProfile(member.household.onboardingProfile);

  return (
    <div className="container max-w-4xl space-y-6 px-4 py-6 sm:py-8 md:px-8">
      <ProfileHeader memberName={member.name} email={user?.email ?? null} />

      <section className="space-y-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[.04em] text-ink-2">Mi hogar</h2>
        <HouseholdCard householdName={member.household.name} canRename={isAdult} />
        {isAdult && (
          <HouseholdSettingsRows
            location={{
              city: member.household.city,
              country: member.household.country,
              timezone: member.household.timezone,
            }}
            planningDay={member.household.planningDay}
            memberId={member.id}
            occupationLevel={member.occupationLevel}
            onboardingProfile={onboardingProfile}
          />
        )}
        <MembersList members={householdMembers} currentMemberId={member.id} />
        <InviteRow inviteCode={member.household.inviteCode} householdName={member.household.name} />
      </section>

      <section className="space-y-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[.04em] text-ink-2">Configuración</h2>
        <SettingsRows />
      </section>

      <AccountActions householdName={member.household.name} />
    </div>
  );
}
