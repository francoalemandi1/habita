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

  const [householdSize, cachedCulture] = await Promise.all([
    prisma.member.count({
      where: { householdId: member.householdId, isActive: true },
    }),
    hasLocation
      ? prisma.relaxSuggestion.findFirst({
          where: {
            householdId: member.householdId,
            locationKey: `${household.latitude!.toFixed(1)}:${household.longitude!.toFixed(1)}`,
            sectionType: "culture",
            expiresAt: { gt: new Date() },
          },
          orderBy: { generatedAt: "desc" },
        })
      : null,
  ]);

  let cachedCultureEvents: RelaxResult["events"] | null = null;
  let cachedCultureAt: string | null = null;

  if (cachedCulture) {
    const result = cachedCulture.suggestions as unknown as RelaxResult;
    cachedCultureEvents = result.events;
    cachedCultureAt = cachedCulture.generatedAt.toISOString();
  }

  return (
    <div className={spacing.pageContainer}>
      <div className={spacing.pageHeader}>
        <h1 className={typography.pageTitle}>Descubrir</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cultura, restaurantes, planes y recetas
        </p>
      </div>
      <DescubrirClient
        aiEnabled={aiEnabled}
        hasHouseholdLocation={hasLocation}
        householdCity={household.city ?? null}
        cachedCultureEvents={cachedCultureEvents}
        cachedCultureAt={cachedCultureAt}
        householdSize={householdSize}
      />
    </div>
  );
}
