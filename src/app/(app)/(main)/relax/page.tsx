import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { RelaxClient } from "@/components/features/relax-client";
import { spacing, typography } from "@/lib/design-tokens";

import type { RelaxResult } from "@/lib/llm/relax-finder";

export const metadata = {
  title: "Relaja",
};

export default async function RelaxPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const aiEnabled = isAIEnabled();
  const household = member.household;
  const hasLocation = !!(household.latitude && household.longitude);

  // Pre-fetch cached culture suggestions (default tab)
  let cachedCultureEvents: RelaxResult["events"] | null = null;
  let cachedCultureAt: string | null = null;

  if (hasLocation) {
    const locationKey = `${household.latitude!.toFixed(1)}:${household.longitude!.toFixed(1)}`;
    const cached = await prisma.relaxSuggestion.findFirst({
      where: {
        householdId: member.householdId,
        locationKey,
        sectionType: "culture",
        expiresAt: { gt: new Date() },
      },
      orderBy: { generatedAt: "desc" },
    });

    if (cached) {
      const result = cached.suggestions as unknown as RelaxResult;
      cachedCultureEvents = result.events;
      cachedCultureAt = cached.generatedAt.toISOString();
    }
  }

  return (
    <div className={spacing.pageContainer}>
      <div className={spacing.pageHeader}>
        <h1 className={typography.pageTitle}>Relaja</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cultura, restaurantes y planes para el fin de semana
        </p>
      </div>
      <RelaxClient
        aiEnabled={aiEnabled}
        hasHouseholdLocation={hasLocation}
        householdCity={household.city ?? null}
        cachedCultureEvents={cachedCultureEvents}
        cachedCultureAt={cachedCultureAt}
      />
    </div>
  );
}
