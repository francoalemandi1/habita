"use client";

import { useState } from "react";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ds/skeleton";
import { InlineError } from "@/components/features/inline-error";
import { PlanesFilters } from "@/components/features/planes/planes-filters";
import { PlanesRow } from "@/components/features/planes/planes-row";
import { usePlanesEvents } from "@/hooks/use-planes-events";
import { useSavedEvents, useToggleSaveEvent, isEventSaved } from "@/hooks/use-saved-items";
import { filterPlansByCategory, formatPlanPriceLabel, getVisiblePlanCategories, sortPlansByDate } from "@/lib/planes-logic";

import type { EventCategory } from "@habita/contracts";

export function PlanesList(): React.JSX.Element {
  const eventsQuery = usePlanesEvents();
  const { data: savedEvents } = useSavedEvents();
  const { toggle, isPending: isSavePending } = useToggleSaveEvent();
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(null);

  const [now] = useState(() => new Date());
  const events = eventsQuery.data?.events ?? [];
  const categories = getVisiblePlanCategories(events);
  const visibleEvents = sortPlansByDate(filterPlansByCategory(events, activeCategory));

  function handleToggleSave(eventId: string) {
    const matched = isEventSaved(savedEvents, eventId);
    if (matched) {
      toggle({ savedEventId: matched.id });
      return;
    }
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    toggle({
      input: {
        culturalEventId: event.id,
        title: event.title,
        description: event.description ?? undefined,
        category: event.category,
        startDate: event.startDate,
        venueName: event.venueName,
        address: event.address ?? undefined,
        priceRange: formatPlanPriceLabel(event.priceMin, event.priceMax),
        sourceUrl: event.sourceUrl,
        imageUrl: event.imageUrl,
        artists: event.artists,
        tags: event.tags,
      },
    });
  }

  if (eventsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (eventsQuery.error) {
    return <InlineError message="No pudimos cargar los planes." onRetry={() => eventsQuery.refetch()} />;
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="Sin planes"
        description="Todavía no encontramos planes cerca de tu casa."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PlanesFilters categories={categories} activeCategory={activeCategory} onSelect={setActiveCategory} />
      {visibleEvents.length === 0 ? (
        <EmptyState icon={Compass} title="Sin planes" description="No hay planes para esta categoría." />
      ) : (
        <div className="flex flex-col">
          {visibleEvents.map((event) => (
            <PlanesRow
              key={event.id}
              event={event}
              isSaved={!!isEventSaved(savedEvents, event.id)}
              isSavePending={isSavePending}
              onToggleSave={() => handleToggleSave(event.id)}
              now={now}
            />
          ))}
        </div>
      )}
    </div>
  );
}
