import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveCityId } from "@/lib/events/city-normalizer";
import { eventRowToRelaxEvent } from "@/lib/events/event-mapper";
import { DescubrirClient } from "@/components/features/descubrir-client";
import { spacing, typography } from "@/lib/design-tokens";

export default async function DescubrirPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const household = member.household;
  const hasLocation = !!(household.latitude && household.longitude);
  const cityName = household.city ?? null;

  // Pre-fetch events from DB for SSR
  const initialEvents = cityName ? await fetchInitialEvents(cityName) : [];

  const todayFormatted = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const todayLabel = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  return (
    <div className={spacing.pageContainer}>
      <div className={spacing.pageHeader}>
        <h1 className={typography.pageTitle}>
          {cityName ? `Descubrí ${cityName}` : "Descubrí"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {todayLabel}
        </p>
      </div>
      <DescubrirClient
        hasHouseholdLocation={hasLocation}
        householdCity={cityName}
        initialEvents={initialEvents}
      />
    </div>
  );
}

/** Fetch active events from cultural_events for SSR. */
async function fetchInitialEvents(cityName: string) {
  try {
    const cityId = await resolveCityId(cityName);
    const now = new Date();
    const threeMonthsFromNow = new Date(now);
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const rows = await prisma.culturalEvent.findMany({
      where: {
        status: "ACTIVE",
        ...(cityId ? { cityId } : {}),
        startDate: {
          gte: now,
          lte: threeMonthsFromNow,
        },
      },
      orderBy: [
        { finalScore: { sort: "desc", nulls: "last" } },
        { startDate: "asc" },
      ],
      take: 50,
      include: { city: true },
    });

    return rows.map((row) => eventRowToRelaxEvent(row));
  } catch (error) {
    console.error("[descubrir] Failed to fetch initial events:", error);
    return [];
  }
}
