import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveCityId } from "@/lib/events/city-normalizer";
import { eventRowToRelaxEvent } from "@/lib/events/event-mapper";
import { toDisplayTitle } from "@/lib/display-title";
import { APP_ROUTES } from "@habita/contracts";
import { SaveEventButton } from "@/components/features/casa/save-event-button";

import type { SaveEventInput } from "@/lib/validations/saved-items";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

/** Event detail (handoff §5.3 "Evento", level 1). "Proponer a la casa" has no backend yet — omitted. */
export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }

  const { id } = await params;

  const event = await prisma.culturalEvent.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      venueName: true,
      address: true,
      latitude: true,
      longitude: true,
      priceMin: true,
      priceMax: true,
      currency: true,
      imageUrl: true,
      sourceUrl: true,
      ticketUrl: true,
      bookingUrl: true,
      artists: true,
      tags: true,
      category: true,
      culturalCategory: true,
      editorialHighlight: true,
      cityId: true,
    },
  });
  if (!event) {
    notFound();
  }

  const householdCityId = member.household.city ? await resolveCityId(member.household.city) : null;
  const belongsToHousehold = event.cityId === null || event.cityId === householdCityId;
  if (!belongsToHousehold) {
    notFound();
  }

  const relaxEvent = eventRowToRelaxEvent(event);
  const saveInput: SaveEventInput = {
    culturalEventId: event.id,
    title: event.title,
    description: event.description ?? undefined,
    category: relaxEvent.category,
    startDate: event.startDate ? event.startDate.toISOString() : null,
    venueName: event.venueName,
    address: event.address,
    priceRange: relaxEvent.priceRange,
    sourceUrl: event.sourceUrl,
    imageUrl: event.imageUrl,
    artists: event.artists,
    tags: event.tags,
    culturalCategory: event.culturalCategory,
    highlightReason: event.editorialHighlight,
    ticketUrl: event.ticketUrl,
    bookingUrl: event.bookingUrl,
    dateInfo: relaxEvent.dateInfo,
  };

  const displayTitle = toDisplayTitle(event.title, event.description);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link href={APP_ROUTES.casa} className="inline-flex items-center gap-1 text-monte">
        <ChevronLeft className="size-5" strokeWidth={1.75} />
        <span className="text-[16px] font-medium">Casa</span>
      </Link>

      <div className="mt-4 overflow-hidden rounded-[20px] bg-surface">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- external event image, no remote pattern configured
          <img src={event.imageUrl} alt={displayTitle} className="h-[240px] w-full object-cover" />
        )}

        <div className="flex flex-col gap-3 p-6">
          <span className="text-[13px] text-ink-2">{relaxEvent.dateInfo}</span>
          <h1 className="text-[32px] font-bold leading-[1.05] tracking-[-.035em] text-ink">{displayTitle}</h1>
          <p className="text-[15px] text-ink-2">{relaxEvent.venue}</p>
          <p className="text-[15px] font-medium text-ink">Entrada: {relaxEvent.priceRange}</p>
          {event.description && <p className="text-[15px] text-ink-2">{event.description}</p>}

          <div className="mt-2">
            <SaveEventButton input={saveInput} />
          </div>
        </div>
      </div>
    </div>
  );
}
