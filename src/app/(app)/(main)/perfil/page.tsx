import { redirect } from "next/navigation";
import { getCurrentMember, getCurrentUserMembers } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProfileSettings } from "@/components/features/profile-settings";
import { SignOutButton } from "@/components/features/sign-out-button";
import { ChevronRight, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { spacing, iconSize, typography } from "@/lib/design-tokens";
import Link from "next/link";
import { APP_ROUTES } from "@habita/contracts";

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
      <PageHeader backButton title="Mi Perfil" />

      {/* Mi Hogar Section */}
      <div className={spacing.sectionGap}>
        <h2 className={`mb-2 ${typography.sectionTitle}`}>Mi Hogar</h2>
        <Link
          href={APP_ROUTES.casa}
          className="flex items-center justify-between gap-2 rounded-2xl bg-card p-4 shadow-sm"
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
          onboardingProfile={member.household.onboardingProfile}
        />
      </div>

      {/* Más — interim links for places not yet rebuilt into Perfil (R3) */}
      <div className={spacing.sectionGap}>
        <h2 className={`mb-2 ${typography.sectionTitle}`}>Más</h2>
        <div className="rounded-2xl bg-card p-1 shadow-sm">
          <Link
            href="/preferences"
            className="flex items-center justify-between gap-2 rounded-xl px-3 py-3 hover:bg-muted/50"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className={iconSize.sm} />
              Preferencias
            </span>
            <ChevronRight className={`${iconSize.sm} shrink-0 text-muted-foreground`} />
          </Link>
        </div>
      </div>

      {/* Sign Out */}
      <SignOutButton />
    </div>
  );
}
