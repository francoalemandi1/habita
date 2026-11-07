import type { EventItem, SaveEventInput } from "@habita/contracts";

/** Best upcoming event for the "Destacado" card: editorial pick, else the soonest future event. */
export function pickDestacadoEvent(events: readonly EventItem[], now: Date): EventItem | null {
  const upcoming = events.filter((event) => {
    if (!event.startDate) return false;
    const startDate = new Date(event.startDate);
    return !Number.isNaN(startDate.getTime()) && startDate.getTime() >= now.getTime();
  });

  const editorial = upcoming.find((event) => Boolean(event.editorialHighlight));
  if (editorial) return editorial;

  if (upcoming.length === 0) return null;
  return upcoming.reduce((soonest, event) =>
    new Date(event.startDate ?? 0) < new Date(soonest.startDate ?? 0) ? event : soonest,
  );
}

/** Price label for an event: "Gratis", "$X+" or "Consultar" when unknown. */
export function formatEventPriceLabel(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Consultar";
  if (min === 0 && (max === null || max === 0)) return "Gratis";
  if (min !== null && min > 0) return `$${min.toLocaleString("es-AR", { maximumFractionDigits: 0 })}+`;
  return "Consultar";
}

/** Maps an `EventItem` into the payload `/api/saved-items/events` expects. */
export function toEventSaveInput(event: EventItem): SaveEventInput {
  return {
    culturalEventId: event.id,
    title: event.title,
    description: event.description ?? undefined,
    category: event.category,
    startDate: event.startDate,
    venueName: event.venueName,
    address: event.address,
    priceRange: formatEventPriceLabel(event.priceMin, event.priceMax),
    sourceUrl: event.sourceUrl,
    imageUrl: event.imageUrl,
    artists: event.artists,
    tags: event.tags,
    culturalCategory: event.culturalCategory,
    highlightReason: event.editorialHighlight,
    ticketUrl: event.ticketUrl,
  };
}
