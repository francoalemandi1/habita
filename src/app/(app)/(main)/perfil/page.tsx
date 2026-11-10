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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6 sm:py-8 md:px-8 xl:max-w-5xl">
      <ProfileHeader memberName={member.name} email={user?.email ?? null} />

      {/* From xl: the household on the left, your settings and account on the right. */}
      <div className="flex flex-col gap-8 xl:grid xl:grid-cols-2 xl:items-start">
        <div className="flex flex-col gap-8">
          <section aria-labelledby="perfil-hogar" className="flex flex-col gap-2">
            <h2 id="perfil-hogar" className="text-[13px] font-semibold uppercase tracking-[.04em] text-ink-2">Mi hogar</h2>
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
          </section>

          <section aria-labelledby="perfil-integrantes" className="flex flex-col gap-2">
            <h2 id="perfil-integrantes" className="text-[13px] font-semibold uppercase tracking-[.04em] text-ink-2">Integrantes</h2>
            <MembersList
              members={householdMembers}
              currentMemberId={member.id}
              footer={<InviteRow inviteCode={member.household.inviteCode} householdName={member.household.name} />}
            />
          </section>
        </div>

        <div className="flex flex-col gap-8">
          <section aria-labelledby="perfil-config" className="flex flex-col gap-2">
            <h2 id="perfil-config" className="text-[13px] font-semibold uppercase tracking-[.04em] text-ink-2">Configuración</h2>
            <SettingsRows />
          </section>

          <AccountActions householdName={member.household.name} />
        </div>
      </div>
    </div>
  );
}
