import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { DescubrirClient } from "@/components/features/descubrir-client";
import { spacing, typography } from "@/lib/design-tokens";

import type { RelaxResult } from "@/lib/llm/relax-finder";

export default async function DescubrirPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const aiEnabled = isAIEnabled();
  const household = member.household;
  const hasLocation = !!(household.latitude && household.longitude);

  const [householdSize, cachedActivities, platformEventCount] = await Promise.all([
    prisma.member.count({
      where: { householdId: member.householdId, isActive: true },
    }),
    hasLocation
      ? prisma.relaxSuggestion.findFirst({
          where: {
            householdId: member.householdId,
            locationKey: `${household.latitude!.toFixed(1)}:${household.longitude!.toFixed(1)}`,
            sectionType: "activities",
            expiresAt: { gt: new Date() },
          },
          orderBy: { generatedAt: "desc" },
        })
      : null,
    // Quick count of active platform events to decide client-side strategy
    prisma.culturalEvent.count({
      where: { status: "ACTIVE" },
    }),
  ]);

  let cachedActivitiesEvents: RelaxResult["events"] | null = null;
  let cachedActivitiesAt: string | null = null;

  if (cachedActivities) {
    const result = cachedActivities.suggestions as unknown as RelaxResult;
    cachedActivitiesEvents = result.events;
    cachedActivitiesAt = cachedActivities.generatedAt.toISOString();
  }

  return (
    <div className={spacing.pageContainer}>
      <div className={spacing.pageHeader}>
        <h1 className={typography.pageTitle}>Descubrir</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Planes, restaurantes y recetas
        </p>
      </div>
      <DescubrirClient
        aiEnabled={aiEnabled}
        hasHouseholdLocation={hasLocation}
        householdCity={household.city ?? null}
        cachedActivitiesEvents={cachedActivitiesEvents}
        cachedActivitiesAt={cachedActivitiesAt}
        householdSize={householdSize}
        platformEventCount={platformEventCount}
      />
    </div>
  );
}
