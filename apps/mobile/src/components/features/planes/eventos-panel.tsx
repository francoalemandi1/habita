import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Compass } from "lucide-react-native";
import { Banner, Button, EmptyState, Skeleton } from "@/components/ds";
import { PlanesFilters } from "@/components/features/planes/planes-filters";
import { PlanesRow } from "@/components/features/planes/planes-row";
import { useEvents } from "@/hooks/use-events";
import { useSavedEvents, useToggleSaveEvent, isEventSaved } from "@/hooks/use-saved-events";
import { spacing } from "@/theme";
import { filterPlansByCategory, getVisiblePlanCategories, sortPlansByDate } from "@/lib/planes-logic";
import { toEventSaveInput } from "@/lib/casa-event";

import type { EventCategory } from "@habita/contracts";

const PLANES_EVENTS_LIMIT = 50;

/** Planes → "Eventos": the household's own event list (handoff §5.2 `/descubrir` → this + destacado en Casa). */
export function EventosPanel(): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(null);

  const eventsQuery = useEvents({ limit: PLANES_EVENTS_LIMIT });
  const savedEventsQuery = useSavedEvents();
  const { toggle, isPending: isSavePending } = useToggleSaveEvent();

  const [now] = useState(() => new Date());
  const events = eventsQuery.data?.events ?? [];
  const savedEvents = savedEventsQuery.data;
  const categories = getVisiblePlanCategories(events);
  const visibleEvents = sortPlansByDate(filterPlansByCategory(events, activeCategory));

  function handleToggleSave(eventId: string) {
    const matched = isEventSaved(savedEvents, eventId);
    if (matched) {
      void toggle({ savedEventId: matched.id });
      return;
    }
    const event = events.find((e) => e.id === eventId);
    if (event) void toggle({ input: toEventSaveInput(event) });
  }

  if (eventsQuery.isLoading) {
    return (
      <View style={styles.loadingList}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} height={60} />
        ))}
      </View>
    );
  }

  if (eventsQuery.isError) {
    return (
      <View style={styles.errorBlock}>
        <Banner tone="attention" text="No pudimos cargar los planes." />
        <Button label="Reintentar" variant="link" onPress={() => void eventsQuery.refetch()} />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState icon={Compass} title="Sin planes" description="Todavía no encontramos planes cerca de tu casa." />
    );
  }

  return (
    <>
      <PlanesFilters categories={categories} activeCategory={activeCategory} onSelect={setActiveCategory} />
      {visibleEvents.length === 0 ? (
        <EmptyState icon={Compass} title="Sin planes" description="No hay planes para esta categoría." />
      ) : (
        visibleEvents.map((event) => (
          <PlanesRow
            key={event.id}
            event={event}
            isSaved={!!isEventSaved(savedEvents, event.id)}
            isSavePending={isSavePending}
            onToggleSave={() => handleToggleSave(event.id)}
            now={now}
          />
        ))
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingList: {
    gap: spacing.sm,
  },
  errorBlock: {
    gap: spacing.sm,
    alignItems: "flex-start",
  },
});
