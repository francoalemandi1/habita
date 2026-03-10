import { useState, useMemo, useCallback } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bookmark,
  BookmarkCheck,
  Calendar,
  Compass,
  MapPin,
  Clock,
  RefreshCw,
  Star,
  Ticket,
} from "lucide-react-native";
import { useEvents } from "@/hooks/use-events";
import { mobileApi } from "@/lib/api";
import { useSavedEvents, useToggleSaveEvent, isEventSaved } from "@/hooks/use-saved-events";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useMilestone } from "@/hooks/use-milestone";
import { useCelebration } from "@/hooks/use-celebration";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { ScreenHeader } from "@/components/features/screen-header";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing, typography } from "@/theme";
import { useFirstVisit } from "@/hooks/use-first-visit";
import { SectionGuideCard } from "@/components/features/section-guide-card";
import { useSectionToured } from "@/hooks/use-guided-tour";
import { Filter } from "lucide-react-native";

import type { ThemeColors } from "@/theme";
import type { EventItem, EventCategory } from "@/hooks/use-events";
import type { SaveEventInput } from "@/hooks/use-saved-events";

// ─── constants ──────────────────────────────────────────────────────────────

const MAX_HIGHLIGHTED = 5;

interface CategoryConfig {
  label: string;
  sectionHeader: string;
  emoji: string;
  chipBg: string;
  chipText: string;
}

const CATEGORY_CONFIG: Partial<Record<EventCategory, CategoryConfig>> = {
  CINE: { label: "Cine", sectionHeader: "En cartelera", emoji: "🎬", chipBg: "#dbeafe", chipText: "#1d4ed8" },
  TEATRO: { label: "Teatro", sectionHeader: "En escena", emoji: "🎭", chipBg: "#fce7f3", chipText: "#be185d" },
  MUSICA: { label: "Música", sectionHeader: "Música en vivo", emoji: "🎵", chipBg: "#ede9fe", chipText: "#6d28d9" },
  EXPOSICIONES: { label: "Expo", sectionHeader: "Para ver", emoji: "🖼", chipBg: "#fef3c7", chipText: "#92400e" },
  FESTIVALES: { label: "Festival", sectionHeader: "Festivales", emoji: "🎪", chipBg: "#fce7f3", chipText: "#be185d" },
  GASTRONOMIA: { label: "Gastro", sectionHeader: "Dónde comer", emoji: "🍽", chipBg: "#ffedd5", chipText: "#c2410c" },
  INFANTIL: { label: "Niños", sectionHeader: "Para chicos", emoji: "🧸", chipBg: "#dcfce7", chipText: "#15803d" },
  MERCADOS: { label: "Mercados", sectionHeader: "Para visitar", emoji: "🛍", chipBg: "#e0e7ff", chipText: "#4338ca" },
  PASEOS: { label: "Paseos", sectionHeader: "Paseos", emoji: "🌿", chipBg: "#dcfce7", chipText: "#15803d" },
};

const CATEGORY_ORDER: EventCategory[] = [
  "CINE", "TEATRO", "MUSICA", "EXPOSICIONES", "FESTIVALES",
  "GASTRONOMIA", "INFANTIL", "MERCADOS", "PASEOS",
];

type ViewMode = "all" | "saved";
type TimeFilter = "today" | "weekend" | "week" | "all";

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "weekend", label: "Finde" },
  { key: "week", label: "Semana" },
];

interface CategoryBucket {
  category: EventCategory;
  config: CategoryConfig;
  events: EventItem[];
}

// ─── helpers ────────────────────────────────────────────────────────────────

function formatEventDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

function getDateProximityLabel(startDate: string | null): { label: string; isUrgent: boolean } | null {
  if (!startDate) return null;
  const eventDate = new Date(startDate);
  if (isNaN(eventDate.getTime())) return null;

  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA");
  const eventStr = eventDate.toLocaleDateString("en-CA");

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString("en-CA");

  if (eventStr === todayStr) return { label: "Hoy", isUrgent: true };
  if (eventStr === tomorrowStr) return { label: "Mañana", isUrgent: true };

  const diffMs = eventDate.getTime() - new Date(`${todayStr}T00:00:00`).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    const dayLabel = eventDate.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
    return { label: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1), isUrgent: false };
  }

  const dateLabel = eventDate.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  return { label: dateLabel, isUrgent: false };
}

function formatPrice(min: number | null, max: number | null): string {
  if (min === null && max === null) return "";
  if (min === 0 && (max === null || max === 0)) return "Gratis";
  if (min !== null && min > 0) return `$${min.toLocaleString("es-AR", { maximumFractionDigits: 0 })}+`;
  return "";
}

function filterByTimeWindow(events: EventItem[], filter: TimeFilter): EventItem[] {
  if (filter === "all") return events;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return events.filter((event) => {
    if (!event.startDate) return false;
    const eventDate = new Date(event.startDate);
    if (isNaN(eventDate.getTime())) return false;
    const eventDayStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    switch (filter) {
      case "today":
        return eventDayStart.getTime() === todayStart.getTime();
      case "weekend": {
        const dayOfWeek = todayStart.getDay();
        const daysUntilFri = dayOfWeek <= 5 ? 5 - dayOfWeek : dayOfWeek === 6 ? 6 : 5;
        const friStart = new Date(todayStart);
        friStart.setDate(friStart.getDate() + daysUntilFri);
        const monStart = new Date(friStart);
        monStart.setDate(monStart.getDate() + 3);
        return eventDayStart >= friStart && eventDayStart < monStart;
      }
      case "week": {
        const weekEnd = new Date(todayStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return eventDayStart >= todayStart && eventDayStart < weekEnd;
      }
      default:
        return true;
    }
  });
}

function bucketByCategory(events: EventItem[]): CategoryBucket[] {
  const buckets = new Map<EventCategory, EventItem[]>();

  for (const event of events) {
    const existing = buckets.get(event.category);
    if (existing) {
      existing.push(event);
    } else {
      buckets.set(event.category, [event]);
    }
  }

  const result: CategoryBucket[] = [];
  for (const cat of CATEGORY_ORDER) {
    const catEvents = buckets.get(cat);
    const config = CATEGORY_CONFIG[cat];
    if (catEvents?.length && config) {
      result.push({ category: cat, config, events: catEvents });
    }
  }

  // Add remaining categories not in CATEGORY_ORDER
  for (const [cat, catEvents] of buckets) {
    if (!CATEGORY_ORDER.includes(cat) && catEvents.length) {
      const config = CATEGORY_CONFIG[cat] ?? {
        label: cat, sectionHeader: cat, emoji: "📅",
        chipBg: "#f3f4f6", chipText: "#374151",
      };
      result.push({ category: cat, config, events: catEvents });
    }
  }

  return result;
}

function eventToSaveInput(event: EventItem): SaveEventInput {
  const priceRange = formatPrice(event.priceMin, event.priceMax) || "Consultar";
  return {
    culturalEventId: event.id,
    title: event.title,
    description: event.description ?? undefined,
    category: event.category,
    startDate: event.startDate,
    venueName: event.venueName,
    address: event.address,
    priceRange,
    sourceUrl: event.sourceUrl,
    imageUrl: event.imageUrl,
    artists: event.artists,
    tags: event.tags,
    culturalCategory: event.culturalCategory,
    highlightReason: event.editorialHighlight,
    ticketUrl: event.ticketUrl,
    dateInfo: event.startDate ? formatEventDate(event.startDate) : undefined,
  };
}

function buildGoogleCalendarUrl(event: EventItem): string | null {
  if (!event.startDate) return null;
  const start = new Date(event.startDate);
  if (isNaN(start.getTime())) return null;

  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const details = [event.description, event.venueName, event.address].filter(Boolean).join(" — ");

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(event.address ?? event.venueName ?? "")}`;
}

// ─── sub-components ─────────────────────────────────────────────────────────

function FilterPill({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterPill, isActive && styles.filterPillActive]}
    >
      <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function EventCard({
  event,
  isSaved,
  onToggleSave,
  savePending,
  wide,
}: {
  event: EventItem;
  isSaved: boolean;
  onToggleSave: () => void;
  savePending: boolean;
  wide?: boolean;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const catConfig = CATEGORY_CONFIG[event.category];
  const priceLabel = formatPrice(event.priceMin, event.priceMax);
  const dateInfo = getDateProximityLabel(event.startDate);
  const primaryUrl = event.ticketUrl ?? event.sourceUrl;
  const calendarUrl = buildGoogleCalendarUrl(event);

  return (
    <View style={wide ? styles.wideEventCardWrapper : undefined}>
      <Card style={[styles.eventCard, wide && styles.wideEventCardInner]}>
        <CardContent compact>
          {/* Header row: category chip + date + save */}
          <View style={styles.eventHeaderRow}>
            {catConfig ? (
              <View style={[styles.categoryChip, { backgroundColor: catConfig.chipBg }]}>
                <Text style={[styles.categoryChipText, { color: catConfig.chipText }]}>
                  {catConfig.emoji} {catConfig.label}
                </Text>
              </View>
            ) : null}
            {dateInfo ? (
              <Badge
                bgColor={dateInfo.isUrgent ? colors.warningBg : colors.infoBg}
                textColor={dateInfo.isUrgent ? colors.warningText : colors.infoText}
              >
                {dateInfo.label}
              </Badge>
            ) : null}
            <View style={styles.headerSpacer} />
            <Pressable
              onPress={onToggleSave}
              hitSlop={8}
              style={styles.saveIconButton}
              disabled={savePending}
            >
              {isSaved ? (
                <BookmarkCheck size={18} color={colors.primary} />
              ) : (
                <Bookmark size={18} color={colors.mutedForeground} />
              )}
            </Pressable>
          </View>

          {/* Title */}
          <Text style={styles.eventTitle} numberOfLines={2}>
            {event.title}
          </Text>

          {/* Artists */}
          {event.artists.length > 0 ? (
            <Text style={styles.eventArtists} numberOfLines={1}>
              {event.artists.join(", ")}
            </Text>
          ) : null}

          {/* Description / editorial highlight */}
          {event.editorialHighlight ? (
            <Text style={styles.eventHighlight} numberOfLines={2}>
              {event.editorialHighlight}
            </Text>
          ) : event.description ? (
            <Text style={styles.eventDesc} numberOfLines={2}>
              {event.description}
            </Text>
          ) : null}

          {/* Meta: date + venue + price */}
          <View style={styles.eventMeta}>
            {event.startDate ? (
              <View style={styles.eventMetaChip}>
                <Clock size={11} color={colors.mutedForeground} />
                <Text style={styles.eventMetaText}>
                  {formatEventDate(event.startDate)}
                </Text>
              </View>
            ) : null}
            {event.venueName ? (
              <View style={styles.eventMetaChip}>
                <MapPin size={11} color={colors.mutedForeground} />
                <Text style={styles.eventMetaText} numberOfLines={1}>
                  {event.venueName}
                </Text>
              </View>
            ) : null}
            {priceLabel ? (
              <Badge
                bgColor={priceLabel === "Gratis" ? colors.successBg : colors.infoBg}
                textColor={priceLabel === "Gratis" ? colors.successText : colors.infoText}
              >
                {priceLabel}
              </Badge>
            ) : null}
          </View>

          {/* CTAs */}
          <View style={styles.eventCtas}>
            {primaryUrl ? (
              <Pressable
                onPress={() => void Linking.openURL(primaryUrl)}
                style={[
                  styles.ctaButton,
                  catConfig ? { backgroundColor: catConfig.chipBg } : undefined,
                ]}
              >
                <Ticket size={13} color={catConfig?.chipText ?? colors.primary} />
                <Text style={[styles.ctaButtonText, catConfig ? { color: catConfig.chipText } : undefined]}>
                  {event.ticketUrl ? "Entradas" : "Ver más"}
                </Text>
              </Pressable>
            ) : null}
            {calendarUrl ? (
              <Pressable
                onPress={() => void Linking.openURL(calendarUrl)}
                style={styles.ctaButtonSecondary}
              >
                <Calendar size={13} color={colors.mutedForeground} />
                <Text style={styles.ctaButtonSecondaryText}>Agendar</Text>
              </Pressable>
            ) : null}
            {event.mapsUrl ?? event.address ?? event.venueName ? (
              <Pressable
                onPress={() => {
                  const url = event.mapsUrl
                    ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address ?? event.venueName ?? "")}`;
                  void Linking.openURL(url);
                }}
                style={styles.ctaButtonSecondary}
              >
                <MapPin size={13} color={colors.mutedForeground} />
                <Text style={styles.ctaButtonSecondaryText}>Ir</Text>
              </Pressable>
            ) : null}
          </View>
        </CardContent>
      </Card>
    </View>
  );
}

/** Horizontal carousel of highlighted events. */
function RecommendedSection({
  events,
  savedEvents,
  onToggleSave,
  savePending,
}: {
  events: EventItem[];
  savedEvents: ReturnType<typeof useSavedEvents>["data"];
  onToggleSave: (event: EventItem) => void;
  savePending: boolean;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (events.length === 0) return null;

  return (
    <View style={styles.recommendedSection}>
      <View style={styles.sectionHeaderRow}>
        <Star size={16} color={colors.warningText} fill={colors.warningText} />
        <Text style={styles.sectionTitle}>Recomendados para vos</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isSaved={!!isEventSaved(savedEvents, event.id)}
            onToggleSave={() => onToggleSave(event)}
            savePending={savePending}
            wide
          />
        ))}
      </ScrollView>
    </View>
  );
}

/** A category section with horizontal-scrolling event cards. */
function CategorySection({
  bucket,
  savedEvents,
  onToggleSave,
  savePending,
}: {
  bucket: CategoryBucket;
  savedEvents: ReturnType<typeof useSavedEvents>["data"];
  onToggleSave: (event: EventItem) => void;
  savePending: boolean;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.categorySection}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionEmoji}>{bucket.config.emoji}</Text>
        <Text style={styles.sectionTitle}>{bucket.config.sectionHeader}</Text>
        <Text style={styles.sectionCount}>{bucket.events.length}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {bucket.events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isSaved={!!isEventSaved(savedEvents, event.id)}
            onToggleSave={() => onToggleSave(event)}
            savePending={savePending}
            wide
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Events content ─────────────────────────────────────────────────────────

function EventsTab() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const eventSaveMilestone = useMilestone("first-event-saved");
  const { celebrate: celebrateEvent } = useCelebration();

  const [activeCategory, setActiveCategory] = useState<EventCategory | undefined>();
  const [activeTimeFilter, setActiveTimeFilter] = useState<TimeFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  const eventsQuery = useEvents({ category: activeCategory, limit: 50 });
  const savedEventsQuery = useSavedEvents();
  const { toggle: toggleSave, isPending: savePending } = useToggleSaveEvent();
  const allEvents = eventsQuery.data?.events ?? [];
  const savedEvents = savedEventsQuery.data;

  const filteredEvents = useMemo(
    () => filterByTimeWindow(allEvents, activeTimeFilter),
    [allEvents, activeTimeFilter],
  );

  // Highlighted events for "Recomendados para vos" — fall back to top events if none are editorially highlighted
  const highlightedEvents = useMemo(() => {
    const editorial = filteredEvents.filter((e) => e.editorialHighlight);
    return (editorial.length > 0 ? editorial : filteredEvents).slice(0, MAX_HIGHLIGHTED);
  }, [filteredEvents]);

  // Events grouped by category
  const categoryBuckets = useMemo(
    () => bucketByCategory(filteredEvents),
    [filteredEvents],
  );

  const handleTimeFilterChange = useCallback((filter: TimeFilter) => {
    setActiveTimeFilter((prev) => (prev === filter ? "all" : filter));
  }, []);

  const handleToggleSave = useCallback(
    (event: EventItem) => {
      const saved = isEventSaved(savedEvents, event.id);
      if (saved) {
        void toggleSave({ savedEventId: saved.id });
      } else {
        void toggleSave({ input: eventToSaveInput(event) });
        void eventSaveMilestone.complete().then((wasFirst) => {
          if (wasFirst) celebrateEvent("first-event-saved");
        });
      }
    },
    [savedEvents, toggleSave, eventSaveMilestone, celebrateEvent],
  );

  return (
    <>
      {/* View mode: All / Guardados */}
      <View style={styles.viewModeRow}>
        <FilterPill
          label="Todos"
          isActive={viewMode === "all"}
          onPress={() => setViewMode("all")}
        />
        <FilterPill
          label={`🔖 Guardados${savedEvents?.length ? ` (${savedEvents.length})` : ""}`}
          isActive={viewMode === "saved"}
          onPress={() => setViewMode("saved")}
        />
      </View>

      {viewMode === "saved" ? (
        /* Saved events view */
        savedEventsQuery.isLoading ? (
          <View style={styles.loadingList}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : !savedEvents?.length ? (
          <EmptyState
            icon={<Bookmark size={32} color={colors.mutedForeground} />}
            title="Sin eventos guardados"
            subtitle="Tocá el ícono de guardar en un evento para verlo acá"
          />
        ) : (
          <View style={styles.eventList}>
            <Text style={styles.resultCount}>
              {savedEvents.length} guardado{savedEvents.length !== 1 ? "s" : ""}
            </Text>
            {savedEvents.map((saved) => {
              const asEvent: EventItem = {
                id: saved.culturalEventId ?? saved.id,
                title: saved.title,
                description: saved.description,
                slug: "",
                startDate: saved.startDate,
                endDate: null,
                venueName: saved.venueName,
                address: saved.address,
                cityId: null,
                province: null,
                category: saved.category as EventCategory,
                tags: saved.tags,
                artists: saved.artists,
                priceMin: null,
                priceMax: null,
                currency: null,
                sourceUrl: saved.sourceUrl,
                imageUrl: saved.imageUrl,
                editorialHighlight: saved.highlightReason,
                culturalCategory: saved.culturalCategory,
                ticketUrl: saved.ticketUrl,
                mapsUrl: null,
              };
              return (
                <EventCard
                  key={saved.id}
                  event={asEvent}
                  isSaved
                  onToggleSave={() => void toggleSave({ savedEventId: saved.id })}
                  savePending={savePending}
                />
              );
            })}
          </View>
        )
      ) : (
        <>
          {/* Time + category filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterScrollContent}
          >
            {TIME_FILTERS.map(({ key, label }) => (
              <FilterPill
                key={key}
                label={label}
                isActive={activeTimeFilter === key}
                onPress={() => handleTimeFilterChange(key)}
              />
            ))}
            <View style={styles.filterDivider} />
            {CATEGORY_ORDER.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              if (!cfg) return null;
              return (
                <FilterPill
                  key={cat}
                  label={`${cfg.emoji} ${cfg.label}`}
                  isActive={activeCategory === cat}
                  onPress={() => setActiveCategory(activeCategory === cat ? undefined : cat)}
                />
              );
            })}
          </ScrollView>

          {/* Content */}
          {eventsQuery.isLoading ? (
            <View style={styles.loadingList}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : eventsQuery.isError ? (
            <Card style={styles.errorCard}>
              <CardContent>
                <Text style={styles.errorText}>{getMobileErrorMessage(eventsQuery.error)}</Text>
              </CardContent>
            </Card>
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              icon={<Text style={{ fontSize: 36 }}>📭</Text>}
              title="Sin eventos"
              subtitle="Probá con otra fecha o categoría"
              steps={[
                { label: "Buscá eventos culturales en tu ciudad" },
                { label: "Filtrá por categoría o fecha" },
                { label: "Guardá tus favoritos con el marcador" },
              ]}
            />
          ) : activeCategory ? (
            /* When filtering by category, show flat list */
            <View style={styles.eventList}>
              <Text style={styles.resultCount}>
                {filteredEvents.length} evento{filteredEvents.length !== 1 ? "s" : ""}
              </Text>
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isSaved={!!isEventSaved(savedEvents, event.id)}
                  onToggleSave={() => handleToggleSave(event)}
                  savePending={savePending}
                />
              ))}
            </View>
          ) : (
            /* Default: Recomendados + category sections */
            <View style={styles.sectionsContainer}>
              <RecommendedSection
                events={highlightedEvents}
                savedEvents={savedEvents}
                onToggleSave={handleToggleSave}
                savePending={savePending}
              />
              {categoryBuckets.map((bucket) => (
                <CategorySection
                  key={bucket.category}
                  bucket={bucket}
                  savedEvents={savedEvents}
                  onToggleSave={handleToggleSave}
                  savePending={savePending}
                />
              ))}
            </View>
          )}
        </>
      )}
    </>
  );
}

// ─── main screen ────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isFirstVisit, dismiss: dismissGuide } = useFirstVisit("descubrir");
  const descubriWasToured = useSectionToured("descubri");
  const eventsQuery = useEvents({ limit: 50 });
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshPipeline = async () => {
    setRefreshing(true);
    try {
      await mobileApi.post("/api/events/refresh", {});
      // Wait a bit for pipeline to start, then refetch events
      setTimeout(() => void eventsQuery.refetch(), 2000);
    } catch {
      // best effort
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader />
      <ScrollView
        bounces={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={eventsQuery.isRefetching}
            tintColor={colors.primary}
            onRefresh={() => void eventsQuery.refetch()}
          />
        }
      >
        {/* Title */}
        <View style={styles.titleRow}>
          <Compass size={22} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.title, { color: colors.text }]}>Descubrí</Text>
        </View>
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle}>Eventos y actividades cerca tuyo</Text>
          <Pressable
            onPress={() => void handleRefreshPipeline()}
            disabled={refreshing}
            style={styles.refreshButton}
          >
            <RefreshCw size={14} color={refreshing ? colors.mutedForeground : colors.primary} />
            <Text style={[styles.refreshButtonText, refreshing && { color: colors.mutedForeground }]}>
              {refreshing ? "Actualizando..." : "Actualizar"}
            </Text>
          </Pressable>
        </View>

        {isFirstVisit && !descubriWasToured ? (
          <SectionGuideCard
            steps={[
              {
                icon: <MapPin size={16} color={colors.primary} />,
                title: "Eventos cerca tuyo",
                description: "Encontrá actividades culturales en tu ciudad",
              },
              {
                icon: <Filter size={16} color={colors.primary} />,
                title: "Filtrá por categoría",
                description: "Teatro, música, exposiciones y más",
              },
              {
                icon: <Bookmark size={16} color={colors.primary} />,
                title: "Guardá favoritos",
                description: "Marcá eventos para no perdértelos",
              },
            ]}
            onDismiss={dismissGuide}
          />
        ) : null}

        <EventsTab />

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────

const WIDE_CARD_WIDTH = 280;

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 24,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    title: {
      ...typography.pageTitle,
    },
    subtitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    subtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.mutedForeground,
    },
    refreshButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: `${c.primary}12`,
    },
    refreshButtonText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "600",
      color: c.primary,
    },

    // Filter pills
    filterScroll: {
      marginBottom: spacing.md,
    },
    filterScrollContent: {
      gap: spacing.xs,
      paddingVertical: 2,
    },
    filterPill: {
      backgroundColor: `${c.muted}99`,
      borderRadius: radius.full,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    filterPillActive: {
      backgroundColor: c.primary,
    },
    filterPillText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "500",
      color: c.mutedForeground,
    },
    filterPillTextActive: {
      color: c.white,
      fontWeight: "600",
    },
    filterDivider: {
      width: 1,
      height: 20,
      backgroundColor: c.border,
      alignSelf: "center",
      marginHorizontal: 4,
    },

    // View mode row
    viewModeRow: {
      flexDirection: "row",
      gap: spacing.xs,
      marginBottom: spacing.md,
    },

    // Result count
    resultCount: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      marginBottom: spacing.sm,
    },

    // Loading / error
    loadingList: {
      gap: spacing.md,
    },
    errorCard: {
      backgroundColor: c.errorBg,
    },
    errorText: {
      fontFamily: fontFamily.sans,
      color: c.errorText,
      fontSize: 14,
    },

    // Events — vertical list
    eventList: {
      gap: spacing.sm,
    },

    // Event card
    eventCard: {
      marginBottom: 0,
    },
    wideEventCardWrapper: {
      width: WIDE_CARD_WIDTH,
      height: 220,
    },
    wideEventCardInner: {
      flex: 1,
    },

    // Event header row: chip + date + save
    eventHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
      flexWrap: "wrap",
    },
    categoryChip: {
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    categoryChipText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "600",
    },
    headerSpacer: {
      flex: 1,
    },
    saveIconButton: {
      padding: 4,
    },

    // Event content
    eventTitle: {
      fontFamily: fontFamily.sans,
      fontWeight: "600",
      color: c.text,
      fontSize: 14,
      lineHeight: 18,
      marginBottom: 2,
    },
    eventArtists: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      fontStyle: "italic",
      marginBottom: 2,
    },
    eventHighlight: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      lineHeight: 16,
      color: c.warningText,
      fontStyle: "italic",
      marginTop: 2,
      marginBottom: 2,
    },
    eventDesc: {
      fontFamily: fontFamily.sans,
      color: c.mutedForeground,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 2,
      marginBottom: 2,
    },
    eventMeta: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: 4,
      flexWrap: "wrap",
      alignItems: "center",
    },
    eventMetaChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    eventMetaText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.mutedForeground,
    },

    // CTAs
    eventCtas: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
      flexWrap: "wrap",
    },
    ctaButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: `${c.primary}15`,
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    ctaButtonText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "600",
      color: c.primary,
    },
    ctaButtonSecondary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: `${c.muted}80`,
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    ctaButtonSecondaryText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "500",
      color: c.mutedForeground,
    },

    // Sections
    sectionsContainer: {
      gap: spacing.lg,
    },
    recommendedSection: {
      gap: spacing.sm,
    },
    categorySection: {
      gap: spacing.sm,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    sectionEmoji: {
      fontSize: 16,
    },
    sectionTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
    },
    sectionCount: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      marginLeft: 2,
    },

    // Horizontal scroll
    horizontalList: {
      gap: spacing.sm,
      paddingRight: spacing.lg,
    },

    bottomPadding: {
      height: 20,
    },
  });
}
