"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Bookmark,
  Film,
  Drama,
  Music,
  Palette,
  PartyPopper,
  Ticket,
  Star,
  RefreshCw,
  ExternalLink,
  MapPin,
  Loader2,
  Info,
  AlertTriangle,
  Clock,
  CalendarPlus,
  Navigation,
  CalendarCheck,
  Banknote,
  UtensilsCrossed,
  Wine,
  Coffee,
  IceCream2,
  Flame,
  Beer,
  Pizza,
  Sandwich,
  Baby,
  GraduationCap,
  Footprints,
} from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useRelaxSuggestions, useRefreshRelaxSection } from "@/hooks/use-relax-suggestions";
import { usePipelineStatus } from "@/hooks/use-pipeline-status";
import { SaveButton } from "@/components/ui/save-button";
import {
  useSavedEvents,
  useToggleSaveEvent,
  isEventSaved,
} from "@/hooks/use-saved-items";
import { cn } from "@/lib/utils";
import { radius, spacing, iconSize, typography, animation } from "@/lib/design-tokens";

import type { RelaxEvent } from "@/lib/events/types";
import type { SavedEvent } from "@prisma/client";
import type { LucideIcon } from "lucide-react";

// ============================================
// Types & constants
// ============================================

interface DescubrirClientProps {
  hasHouseholdLocation: boolean;
  householdCity: string | null;
  /** Server-side pre-fetched events from cultural_events table. */
  initialEvents: RelaxEvent[];
}

interface CategoryConfig {
  label: string;
  icon: LucideIcon;
  sectionHeader: string;
}

const CATEGORIES: Record<string, CategoryConfig> = {
  // Activities
  cine: { label: "Cine", icon: Film, sectionHeader: "En cartelera" },
  teatro: { label: "Teatro", icon: Drama, sectionHeader: "En escena" },
  musica: { label: "Música", icon: Music, sectionHeader: "Música en vivo" },
  danza: { label: "Danza", icon: Footprints, sectionHeader: "Danza" },
  muestras: { label: "Muestras", icon: Palette, sectionHeader: "Para ver" },
  talleres: { label: "Talleres", icon: GraduationCap, sectionHeader: "Talleres" },
  ferias: { label: "Ferias", icon: PartyPopper, sectionHeader: "Para visitar" },
  infantil: { label: "Infantil", icon: Baby, sectionHeader: "Para chicos" },
  // Restaurants
  restaurantes: { label: "Restaurantes", icon: UtensilsCrossed, sectionHeader: "Dónde comer" },
  bares: { label: "Bares", icon: Wine, sectionHeader: "Bares y cervecerías" },
  cafes: { label: "Cafés", icon: Coffee, sectionHeader: "Cafés" },
  cervecerias: { label: "Cervecerías", icon: Beer, sectionHeader: "Cervecerías" },
  heladerias: { label: "Heladerías", icon: IceCream2, sectionHeader: "Heladerías" },
  pizzerias: { label: "Pizzerías", icon: Pizza, sectionHeader: "Pizzerías" },
  comida_rapida: { label: "Rápida", icon: Sandwich, sectionHeader: "Comida rápida" },
  parrillas: { label: "Parrillas", icon: Flame, sectionHeader: "Parrillas" },
};

const ACTIVITIES_CATEGORY_ORDER = ["cine", "teatro", "musica", "danza", "muestras", "talleres", "ferias", "infantil"];

// ============================================
// Temporal filter
// ============================================

type TimeFilter = "today" | "weekend" | "week" | "all";

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "weekend", label: "Finde" },
  { key: "week", label: "Entre semana" },
];

// ============================================
// Category color system
// ============================================

interface CategoryColorSet {
  cardBg: string;
  cardBorder: string;
  iconBg: string;
  iconColor: string;
  pillActiveBg: string;
  pillActiveText: string;
  chipBg: string;
  chipText: string;
}

/** Per-category color system — accent color for chips, CTAs, and card left border. */
const CATEGORY_COLORS: Record<string, CategoryColorSet> = {
  cine: {
    cardBg: "bg-violet-50/60", cardBorder: "border-violet-200/70",
    iconBg: "bg-violet-100", iconColor: "text-violet-600",
    pillActiveBg: "bg-violet-600", pillActiveText: "text-white",
    chipBg: "bg-violet-100", chipText: "text-violet-700",
  },
  teatro: {
    cardBg: "bg-orange-50/60", cardBorder: "border-orange-200/70",
    iconBg: "bg-orange-100", iconColor: "text-orange-600",
    pillActiveBg: "bg-orange-600", pillActiveText: "text-white",
    chipBg: "bg-orange-100", chipText: "text-orange-700",
  },
  musica: {
    cardBg: "bg-pink-50/60", cardBorder: "border-pink-200/70",
    iconBg: "bg-pink-100", iconColor: "text-pink-600",
    pillActiveBg: "bg-pink-600", pillActiveText: "text-white",
    chipBg: "bg-pink-100", chipText: "text-pink-700",
  },
  muestras: {
    cardBg: "bg-emerald-50/60", cardBorder: "border-emerald-200/70",
    iconBg: "bg-emerald-100", iconColor: "text-emerald-600",
    pillActiveBg: "bg-emerald-600", pillActiveText: "text-white",
    chipBg: "bg-emerald-100", chipText: "text-emerald-700",
  },
  danza: {
    cardBg: "bg-fuchsia-50/60", cardBorder: "border-fuchsia-200/70",
    iconBg: "bg-fuchsia-100", iconColor: "text-fuchsia-600",
    pillActiveBg: "bg-fuchsia-600", pillActiveText: "text-white",
    chipBg: "bg-fuchsia-100", chipText: "text-fuchsia-700",
  },
  talleres: {
    cardBg: "bg-cyan-50/60", cardBorder: "border-cyan-200/70",
    iconBg: "bg-cyan-100", iconColor: "text-cyan-600",
    pillActiveBg: "bg-cyan-600", pillActiveText: "text-white",
    chipBg: "bg-cyan-100", chipText: "text-cyan-700",
  },
  ferias: {
    cardBg: "bg-amber-50/60", cardBorder: "border-amber-200/70",
    iconBg: "bg-amber-100", iconColor: "text-amber-600",
    pillActiveBg: "bg-amber-600", pillActiveText: "text-white",
    chipBg: "bg-amber-100", chipText: "text-amber-700",
  },
  infantil: {
    cardBg: "bg-teal-50/60", cardBorder: "border-teal-200/70",
    iconBg: "bg-teal-100", iconColor: "text-teal-600",
    pillActiveBg: "bg-teal-600", pillActiveText: "text-white",
    chipBg: "bg-teal-100", chipText: "text-teal-700",
  },
  restaurantes: {
    cardBg: "bg-rose-50/60", cardBorder: "border-rose-200/70",
    iconBg: "bg-rose-100", iconColor: "text-rose-600",
    pillActiveBg: "bg-rose-600", pillActiveText: "text-white",
    chipBg: "bg-rose-100", chipText: "text-rose-700",
  },
  bares: {
    cardBg: "bg-indigo-50/60", cardBorder: "border-indigo-200/70",
    iconBg: "bg-indigo-100", iconColor: "text-indigo-600",
    pillActiveBg: "bg-indigo-600", pillActiveText: "text-white",
    chipBg: "bg-indigo-100", chipText: "text-indigo-700",
  },
  cafes: {
    cardBg: "bg-yellow-50/60", cardBorder: "border-yellow-200/70",
    iconBg: "bg-yellow-100", iconColor: "text-yellow-700",
    pillActiveBg: "bg-yellow-600", pillActiveText: "text-white",
    chipBg: "bg-yellow-100", chipText: "text-yellow-700",
  },
  cervecerias: {
    cardBg: "bg-amber-50/60", cardBorder: "border-amber-200/70",
    iconBg: "bg-amber-100", iconColor: "text-amber-600",
    pillActiveBg: "bg-amber-600", pillActiveText: "text-white",
    chipBg: "bg-amber-100", chipText: "text-amber-700",
  },
  heladerias: {
    cardBg: "bg-sky-50/60", cardBorder: "border-sky-200/70",
    iconBg: "bg-sky-100", iconColor: "text-sky-600",
    pillActiveBg: "bg-sky-600", pillActiveText: "text-white",
    chipBg: "bg-sky-100", chipText: "text-sky-700",
  },
  pizzerias: {
    cardBg: "bg-orange-50/60", cardBorder: "border-orange-200/70",
    iconBg: "bg-orange-100", iconColor: "text-orange-600",
    pillActiveBg: "bg-orange-600", pillActiveText: "text-white",
    chipBg: "bg-orange-100", chipText: "text-orange-700",
  },
  comida_rapida: {
    cardBg: "bg-lime-50/60", cardBorder: "border-lime-200/70",
    iconBg: "bg-lime-100", iconColor: "text-lime-700",
    pillActiveBg: "bg-lime-600", pillActiveText: "text-white",
    chipBg: "bg-lime-100", chipText: "text-lime-700",
  },
  parrillas: {
    cardBg: "bg-red-50/60", cardBorder: "border-red-200/70",
    iconBg: "bg-red-100", iconColor: "text-red-600",
    pillActiveBg: "bg-red-600", pillActiveText: "text-white",
    chipBg: "bg-red-100", chipText: "text-red-700",
  },
};

/** Fallback for unknown categories. */
const DEFAULT_CARD_COLORS: CategoryColorSet = {
  cardBg: "bg-muted/40", cardBorder: "border-border",
  iconBg: "bg-muted", iconColor: "text-muted-foreground",
  pillActiveBg: "bg-primary", pillActiveText: "text-white",
  chipBg: "bg-muted/70", chipText: "text-muted-foreground",
};

/** Gradient backgrounds for highlighted cards (rotate through). */
const HIGHLIGHT_GRADIENTS = [
  "from-violet-500/15 via-primary/5 to-fuchsia-500/10",
  "from-orange-500/15 via-amber-500/5 to-rose-500/10",
  "from-emerald-500/15 via-teal-500/5 to-cyan-500/10",
  "from-pink-500/15 via-rose-500/5 to-purple-500/10",
  "from-amber-500/15 via-yellow-500/5 to-orange-500/10",
];

/** Maximum highlighted events in the "Destacados" section. */
const MAX_HIGHLIGHTED = 5;

/** Deterministic threshold for "Highly Recommended". */
const HIGHLIGHT_SCORE_THRESHOLD = 7;

// ============================================
// Helpers
// ============================================

function getCategoryColors(category: string): CategoryColorSet {
  return CATEGORY_COLORS[category] ?? DEFAULT_CARD_COLORS;
}

/** Build the save input payload from a RelaxEvent. */
function buildSaveEventInput(event: RelaxEvent) {
  return {
    culturalEventId: event.id ?? undefined,
    title: event.title,
    description: event.description || undefined,
    category: event.category,
    startDate: event.startDate,
    venueName: event.venue || undefined,
    priceRange: event.priceRange,
    sourceUrl: event.sourceUrl,
    imageUrl: event.imageUrl,
    artists: event.artists,
    tags: event.tags,
    culturalCategory: event.culturalCategory,
    highlightReason: event.highlightReason,
    ticketUrl: event.ticketUrl,
    bookingUrl: event.bookingUrl,
    dateInfo: event.dateInfo,
  };
}

function getCategoryLabel(event: RelaxEvent): string {
  return CATEGORIES[event.category]?.label ?? event.category;
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Justo ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

/** Compact proximity label for event dates: "Hoy", "Mañana", "Sáb 1 mar", etc. */
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

  // Within 7 days — show day name + date
  const diffMs = eventDate.getTime() - new Date(`${todayStr}T00:00:00`).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    const dayLabel = eventDate.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
    return { label: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1), isUrgent: false };
  }

  // Beyond 7 days — compact date
  const dateLabel = eventDate.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  return { label: dateLabel, isUrgent: false };
}

/** Build a Google Calendar "add event" URL with preconfigured date/time. */
function buildCalendarUrl(event: RelaxEvent): string | null {
  const title = encodeURIComponent(event.title);
  const location = encodeURIComponent(event.venue);
  const details = encodeURIComponent(
    [event.description, event.sourceUrl ? `Más info: ${event.sourceUrl}` : ""]
      .filter(Boolean)
      .join("\n\n"),
  );

  let dateParams = "";
  if (event.startDate) {
    const start = new Date(event.startDate);
    if (!isNaN(start.getTime())) {
      // Format as Google Calendar date string: YYYYMMDDTHHmmss
      const toGcalDate = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
      };
      // Default duration: 2 hours
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      dateParams = `&dates=${toGcalDate(start)}/${toGcalDate(end)}`;
    }
  }

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&location=${location}&details=${details}${dateParams}`;
}

// ============================================
// Temporal filtering
// ============================================

/** Filter events by time window. All comparisons use date-only (ignore time). */
function filterByTimeWindow(events: RelaxEvent[], filter: TimeFilter): RelaxEvent[] {
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
        // Viernes = 5, Sábado = 6, Domingo = 0
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

// ============================================
// Category bucketing
// ============================================

interface CategoryBucket {
  key: string;
  label: string;
  events: RelaxEvent[];
}

/** Group events by category, sorted chronologically within each group. */
function bucketByCategory(events: RelaxEvent[], categoryOrder: string[]): CategoryBucket[] {
  const groups = new Map<string, RelaxEvent[]>();
  for (const event of events) {
    const existing = groups.get(event.category);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(event.category, [event]);
    }
  }

  const sortByDate = (a: RelaxEvent, b: RelaxEvent) => {
    if (!a.startDate || !b.startDate) return 0;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  };

  return categoryOrder
    .filter((key) => groups.has(key))
    .map((key) => ({
      key,
      label: CATEGORIES[key]?.sectionHeader ?? key,
      events: groups.get(key)!.sort(sortByDate),
    }));
}

// ============================================
// Component
// ============================================

export function DescubrirClient({
  hasHouseholdLocation,
  householdCity,
  initialEvents,
}: DescubrirClientProps) {
  const { location, isLoading: isGeoLoading } = useGeolocation();
  const [activeTimeFilter, setActiveTimeFilter] = useState<TimeFilter>("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const { isRunning: isPipelineRunning, refetchStatus } = usePipelineStatus();
  const { data: savedEvents } = useSavedEvents();

  const initialData = useMemo(() => {
    if (initialEvents.length === 0) return undefined;
    return {
      events: initialEvents,
      summary: "",
      generatedAt: new Date().toISOString(),
    };
  }, [initialEvents]);

  const locationLabel = useMemo(() => {
    if (location?.city) return location.city;
    if (householdCity) return householdCity;
    return null;
  }, [location, householdCity]);

  // Activities query — always enabled, uses SSR initial data
  const query = useRelaxSuggestions({
    section: "activities",
    enabled: true,
    initialData,
    initialDataUpdatedAt: initialEvents.length > 0 ? Date.now() : undefined,
    location,
    isGeoLoading,
    hasHouseholdLocation,
  });

  const handleTimeFilterChange = useCallback((filter: TimeFilter) => {
    setActiveTimeFilter(filter);
    setActiveCategory(null);
  }, []);

  const refreshSection = useRefreshRelaxSection();
  const handleRefresh = useCallback(async () => {
    await refreshSection();
    refetchStatus();
  }, [refreshSection, refetchStatus]);

  // Split: recommended events + rest bucketed by category
  const { recommendedEvents, categoryBuckets, visibleCategories } = useMemo(() => {
    const allEvents = query.data?.events;
    if (!allEvents || allEvents.length === 0) {
      return {
        recommendedEvents: [] as RelaxEvent[],
        categoryBuckets: [] as CategoryBucket[],
        visibleCategories: [] as string[],
      };
    }

    // 0. Apply temporal filter
    const events = filterByTimeWindow(allEvents, activeTimeFilter);

    // 1. Extract recommended events (pipeline-scored)
    const recommended: RelaxEvent[] = [];
    const remaining: RelaxEvent[] = [];

    for (const event of events) {
      const isRecommended =
        event.finalScore !== null &&
        event.finalScore >= HIGHLIGHT_SCORE_THRESHOLD &&
        event.highlightReason !== null &&
        event.highlightReason.length > 0;

      if (isRecommended && recommended.length < MAX_HIGHLIGHTED) {
        recommended.push(event);
      } else {
        remaining.push(event);
      }
    }

    // 2. Bucket remaining events by category, sorted chronologically within each
    const buckets = bucketByCategory(remaining, ACTIVITIES_CATEGORY_ORDER);

    // 3. Collect visible categories (union across all buckets)
    const categorySet = new Set<string>();
    for (const bucket of buckets) {
      for (const event of bucket.events) {
        categorySet.add(event.category);
      }
    }
    for (const event of recommended) {
      categorySet.add(event.category);
    }
    const visible = ACTIVITIES_CATEGORY_ORDER.filter((key) => categorySet.has(key));

    return { recommendedEvents: recommended, categoryBuckets: buckets, visibleCategories: visible };
  }, [query.data?.events, activeTimeFilter]);

  // Apply category filter across all temporal buckets
  const displayBuckets = useMemo(() => {
    if (!activeCategory) return categoryBuckets;
    return categoryBuckets
      .map((bucket) => ({
        ...bucket,
        events: bucket.events.filter((e) => e.category === activeCategory),
      }))
      .filter((bucket) => bucket.events.length > 0);
  }, [categoryBuckets, activeCategory]);

  // No location available
  const hasGeo = !!(location && location.latitude !== 0 && location.longitude !== 0);
  if (!isGeoLoading && !hasGeo && !hasHouseholdLocation) {
    return (
      <EmptyState
        icon={MapPin}
        title="Ubicación necesaria"
        description="Activá la geolocalización o configurá la ubicación de tu hogar en el perfil."
      />
    );
  }

  const isBusy = isPipelineRunning || query.isFetching;
  const isLoading = isBusy && !query.data;
  const isRefreshing = isBusy && !!query.data;
  const hasFilteredEvents = recommendedEvents.length > 0 || categoryBuckets.length > 0;

  return (
    <div className={spacing.contentStack}>
      {/* Location + refresh header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className={iconSize.sm} />
          {locationLabel ? (
            <span>{locationLabel}</span>
          ) : (
            <span>Detectando ubicación...</span>
          )}
          {query.data?.generatedAt && (
            <>
              <span>·</span>
              <span className="text-xs">{formatTimeAgo(query.data.generatedAt)}</span>
            </>
          )}
        </div>
        <button
            type="button"
            onClick={handleRefresh}
            disabled={isBusy}
            className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn(iconSize.xs, isBusy && "animate-spin")} />
            {isPipelineRunning ? "Buscando eventos..." : isRefreshing ? "Actualizando..." : "Actualizar"}
          </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            {isPipelineRunning
              ? "Buscando eventos en la web... esto puede tardar unos minutos"
              : "Cargando planes y actividades..."}
          </p>
        </div>
      )}

      {/* Error states */}
      {query.error && !query.data && (
        <EmptyState
          icon={Info}
          title="Error"
          description="No pudimos cargar los planes. Intentá en unos minutos."
        />
      )}
      {query.error && query.data && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className={iconSize.sm} />
          No se pudo actualizar. Intentá en unos minutos.
        </div>
      )}

      {/* Recomendados para vos — activities only */}
      {recommendedEvents.length > 0 && (
        <section>
          <h2 className={cn(typography.label, "mb-2")}>Recomendados para vos</h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none snap-x snap-proximity">
            {recommendedEvents.map((event, index) => (
              <HighlightedEventCard
                key={`highlight-${event.title}-${index}`}
                event={event}
                colorIndex={index}
                savedEvents={savedEvents}
              />
            ))}
          </div>
        </section>
      )}

      {/* Filter chips: guardados + temporal + category */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* Guardados chip */}
        <button
          type="button"
          onClick={() => {
            setShowSaved(!showSaved);
            if (!showSaved) {
              setActiveTimeFilter("all");
              setActiveCategory(null);
            }
          }}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            showSaved
              ? "bg-primary text-white"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Bookmark className={iconSize.xs} />
          Guardados
          {savedEvents && savedEvents.length > 0 && (
            <span className={cn(
              "ml-0.5 rounded-full px-1.5 text-[10px]",
              showSaved ? "bg-white/20" : "bg-primary/10 text-primary"
            )}>
              {savedEvents.length}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="mx-0.5 my-1 w-px shrink-0 bg-border" />

        {/* Temporal chips */}
        {TIME_FILTERS.map(({ key, label }) => (
          <FilterPill
            key={`time-${key}`}
            label={label}
            isActive={!showSaved && activeTimeFilter === key}
            onClick={() => {
              if (showSaved) setShowSaved(false);
              handleTimeFilterChange(activeTimeFilter === key ? "all" : key);
            }}
          />
        ))}

        {/* Divider */}
        {visibleCategories.length > 1 && (
          <div className="mx-0.5 my-1 w-px shrink-0 bg-border" />
        )}

        {/* Category chips */}
        {visibleCategories.map((key) => {
          const config = CATEGORIES[key];
          if (!config) return null;
          const Icon = config.icon;
          return (
            <FilterPill
              key={key}
              label={config.label}
              icon={<Icon className={iconSize.xs} />}
              isActive={activeCategory === key}
              onClick={() => setActiveCategory(activeCategory === key ? null : key)}
              categoryKey={key}
            />
          );
        })}
      </div>

      {/* Saved events view */}
      {showSaved ? (
        <SavedEventsView savedEvents={savedEvents ?? []} />
      ) : (
        <>
          {/* Temporal / category sections */}
          {hasFilteredEvents && (
            <div className="space-y-6">
              {displayBuckets.map((bucket) => (
                <CategorySection
                  key={bucket.key}
                  label={bucket.label}
                  events={bucket.events}
                  savedEvents={savedEvents}
                />
              ))}
            </div>
          )}

          {/* No results */}
          {query.data?.events && !hasFilteredEvents && (
            <EmptyState
              icon={Info}
              title="Sin planes"
              description={
                activeTimeFilter === "today"
                  ? "No hay planes para hoy. Probá con otro filtro."
                  : activeTimeFilter === "weekend"
                    ? "No encontramos planes para este finde."
                    : activeTimeFilter === "week"
                      ? "No hay planes esta semana."
                      : "No encontramos planes. Intentá actualizar."
              }
            />
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// Highlighted event card (Destacados)
// ============================================

function HighlightedEventCard({
  event,
  colorIndex,
  savedEvents,
}: {
  event: RelaxEvent;
  colorIndex: number;
  savedEvents?: SavedEvent[];
}) {
  const gradient = HIGHLIGHT_GRADIENTS[colorIndex % HIGHLIGHT_GRADIENTS.length]!;
  const colors = getCategoryColors(event.category);
  const calendarUrl = buildCalendarUrl(event);
  const dateProximity = getDateProximityLabel(event.startDate);
  const { toggle, isPending: isSaveToggling } = useToggleSaveEvent();

  const matchedSaved = isEventSaved(savedEvents, event.id ?? undefined);
  const isSaved = !!matchedSaved;

  const handleToggleSave = useCallback(() => {
    if (matchedSaved) {
      toggle({ savedEventId: matchedSaved.id });
    } else {
      toggle({ input: buildSaveEventInput(event) });
    }
  }, [matchedSaved, toggle, event]);

  const primaryCta = event.ticketUrl
    ? { href: event.ticketUrl, label: "Entradas", icon: Ticket }
    : event.bookingUrl
      ? { href: event.bookingUrl, label: "Reservar", icon: CalendarCheck }
      : event.sourceUrl
        ? { href: event.sourceUrl, label: "Ver más", icon: ExternalLink }
        : null;

  return (
    <div
      className={cn(
        radius.card,
        "w-[280px] shrink-0 snap-start border p-4",
        "bg-linear-to-br",
        gradient,
        colors.cardBorder,
        animation.hoverScaleSubtle,
        "hover:shadow-md",
      )}
    >
      {/* Category chip + date + star */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5",
              "text-[11px] font-bold uppercase tracking-wide",
              colors.chipBg,
              colors.chipText,
            )}
          >
            {getCategoryLabel(event)}
          </span>
          {dateProximity && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                dateProximity.isUrgent
                  ? "bg-foreground/10 text-foreground font-bold"
                  : "bg-foreground/5 text-muted-foreground",
              )}
            >
              <Clock className="h-3 w-3" />
              {dateProximity.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <SaveButton isSaved={isSaved} isPending={isSaveToggling} onToggle={handleToggleSave} />
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-2 text-base font-bold leading-snug line-clamp-2">
        {event.title}
      </h3>

      {/* Artists */}
      {event.artists.length > 0 && (
        <p className="mt-0.5 text-xs font-semibold truncate opacity-80">
          {event.artists.join(" · ")}
        </p>
      )}

      {/* Editorial highlight */}
      {event.highlightReason && (
        <p className="mt-1.5 text-xs leading-relaxed opacity-60 line-clamp-2 italic">
          &ldquo;{event.highlightReason}&rdquo;
        </p>
      )}

      {/* Price */}
      <div className="mt-3">
        <PriceBadge priceRange={event.priceRange} />
      </div>

      {/* Metadata */}
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Clock className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span>{event.dateInfo}</span>
        </div>
        <div className="flex items-center gap-2 text-xs opacity-70">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{event.venue}</span>
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-3 flex items-center gap-2">
        {primaryCta && (
          <a
            href={primaryCta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-bold text-background transition-colors hover:bg-foreground/90"
          >
            <primaryCta.icon className="h-3.5 w-3.5" />
            {primaryCta.label}
          </a>
        )}
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium opacity-60 transition-opacity hover:opacity-100"
          >
            <Navigation className="h-3 w-3" />
            Ir
          </a>
        )}
        {calendarUrl && (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium opacity-60 transition-opacity hover:opacity-100"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Agendar
          </a>
        )}
      </div>
    </div>
  );
}

// ============================================
// Temporal section
// ============================================

function CategorySection({
  label,
  events,
  savedEvents,
}: {
  label: string;
  events: RelaxEvent[];
  savedEvents?: SavedEvent[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <h2 className="text-sm font-bold">{label}</h2>
        <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {events.length}
        </span>
      </div>

      {/* Mobile: horizontal scroll | Desktop: 2-col grid */}
      <div
        className={cn(
          "flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-proximity -mx-4 px-4",
          "sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:snap-none",
        )}
      >
        {events.map((event, index) => (
          <div
            key={`${event.title}-${index}`}
            className="flex min-w-0 w-[260px] shrink-0 snap-start sm:w-auto sm:shrink"
          >
            <EventCard event={event} savedEvents={savedEvents} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// Event card (regular)
// ============================================

function EventCard({ event, savedEvents }: { event: RelaxEvent; savedEvents?: SavedEvent[] }) {
  const colors = getCategoryColors(event.category);
  const calendarUrl = buildCalendarUrl(event);
  const dateProximity = getDateProximityLabel(event.startDate);
  const { toggle, isPending: isSaveToggling } = useToggleSaveEvent();

  const matchedSaved = isEventSaved(savedEvents, event.id ?? undefined);
  const isSaved = !!matchedSaved;

  const handleToggleSave = useCallback(() => {
    if (matchedSaved) {
      toggle({ savedEventId: matchedSaved.id });
    } else {
      toggle({ input: buildSaveEventInput(event) });
    }
  }, [matchedSaved, toggle, event]);

  // Determine primary CTA
  const primaryCta = event.ticketUrl
    ? { href: event.ticketUrl, label: "Entradas", icon: Ticket }
    : event.bookingUrl
      ? { href: event.bookingUrl, label: "Reservar", icon: CalendarCheck }
      : event.sourceUrl
        ? { href: event.sourceUrl, label: "Ver más", icon: ExternalLink }
        : null;

  return (
    <div
      className={cn(
        radius.card,
        "flex h-full min-w-0 flex-col border p-4 transition-all",
        colors.cardBg,
        colors.cardBorder,
        animation.hoverScaleSubtle,
        "hover:shadow-md",
      )}
    >
      {/* Category chip + date proximity + save */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5",
              "text-[11px] font-bold uppercase tracking-wide",
              colors.chipBg,
              colors.chipText,
            )}
          >
            {getCategoryLabel(event)}
          </span>
          {dateProximity && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                dateProximity.isUrgent
                  ? "bg-foreground/10 text-foreground font-bold"
                  : "bg-foreground/5 text-muted-foreground",
              )}
            >
              <Clock className="h-3 w-3" />
              {dateProximity.label}
            </span>
          )}
        </div>
        <SaveButton isSaved={isSaved} isPending={isSaveToggling} onToggle={handleToggleSave} />
      </div>

      {/* Title */}
      <h3 className="mt-2 text-[15px] font-bold leading-snug line-clamp-2">
        {event.title}
      </h3>

      {/* Artists */}
      {event.artists.length > 0 && (
        <p className="mt-0.5 text-xs font-semibold truncate opacity-80">
          {event.artists.join(" · ")}
        </p>
      )}

      {/* Description */}
      {event.description && (
        <p className="mt-1.5 text-xs leading-relaxed opacity-70 line-clamp-2">
          {event.description}
        </p>
      )}

      {/* Tip (practical detail, common for restaurants) */}
      {event.tip && (
        <p className="mt-1 text-xs italic opacity-60 line-clamp-1">
          {event.tip}
        </p>
      )}

      {/* Bottom section — pushed down to align cards */}
      <div className="mt-auto pt-3">
        {/* Price */}
        <PriceBadge priceRange={event.priceRange} />

        {/* Metadata: date + venue */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Clock className="h-3.5 w-3.5 shrink-0 opacity-60" />
            <span>{event.dateInfo}</span>
          </div>
          <div className="flex items-center gap-2 text-xs opacity-70">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {primaryCta && (
            <a
              href={primaryCta.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors",
                colors.pillActiveBg,
                colors.pillActiveText,
                "hover:brightness-110",
              )}
            >
              <primaryCta.icon className="h-3.5 w-3.5" />
              {primaryCta.label}
            </a>
          )}
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors",
                colors.chipBg,
                colors.chipText,
                "hover:brightness-95",
              )}
            >
              <Navigation className="h-3 w-3" />
              Ir
            </a>
          )}
          {calendarUrl && (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors",
                colors.chipBg,
                colors.chipText,
                "hover:brightness-95",
              )}
            >
              <CalendarPlus className="h-3 w-3" />
              Agendar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Price badge
// ============================================

function PriceBadge({ priceRange }: { priceRange: string }) {
  const isGratis = priceRange === "Gratis";
  const isConsultar = priceRange === "Consultar";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
        isGratis && "bg-green-200/80 text-green-800",
        isConsultar && "bg-muted/70 text-muted-foreground font-medium",
        !isGratis && !isConsultar && "bg-amber-200/80 text-amber-900",
      )}
    >
      {isGratis ? (
        <>Gratis</>
      ) : isConsultar ? (
        <>Consultar precio</>
      ) : (
        <>
          <Banknote className="h-3 w-3" />
          {priceRange}
        </>
      )}
    </span>
  );
}

// ============================================
// Shared sub-components
// ============================================

function FilterPill({
  label,
  icon,
  isActive,
  onClick,
  categoryKey,
}: {
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  categoryKey?: string;
}) {
  const catColors = categoryKey ? CATEGORY_COLORS[categoryKey] : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive && catColors
          ? cn(catColors.pillActiveBg, catColors.pillActiveText)
          : isActive
            ? "bg-primary text-white"
            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ============================================
// Saved events view
// ============================================

function savedEventToRelax(saved: SavedEvent): RelaxEvent {
  return {
    id: saved.culturalEventId,
    title: saved.title,
    description: saved.description ?? "",
    category: saved.category,
    venue: saved.venueName ?? "",
    dateInfo: saved.dateInfo ?? "",
    priceRange: saved.priceRange,
    audience: null,
    tip: null,
    url: null,
    sourceUrl: saved.sourceUrl,
    imageUrl: saved.imageUrl,
    highlightReason: saved.highlightReason,
    ticketUrl: saved.ticketUrl,
    bookingUrl: saved.bookingUrl,
    finalScore: null,
    culturalCategory: saved.culturalCategory,
    artists: saved.artists,
    tags: saved.tags,
    startDate: saved.startDate ? new Date(saved.startDate).toISOString() : null,
  };
}

function SavedEventsView({ savedEvents }: { savedEvents: SavedEvent[] }) {
  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const upcomingList: SavedEvent[] = [];
    const pastList: SavedEvent[] = [];

    for (const event of savedEvents) {
      if (event.startDate) {
        const eventDate = new Date(event.startDate);
        if (eventDate < todayStart) {
          pastList.push(event);
        } else {
          upcomingList.push(event);
        }
      } else {
        // No date — consider upcoming
        upcomingList.push(event);
      }
    }

    // Upcoming: soonest first
    upcomingList.sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    // Past: most recent first
    pastList.sort((a, b) => {
      if (!a.startDate || !b.startDate) return 0;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    return { upcoming: upcomingList, past: pastList };
  }, [savedEvents]);

  if (savedEvents.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Sin eventos guardados"
        description="Tocá el ícono de guardado en cualquier evento para verlo acá."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2.5">
            <h2 className="text-sm font-bold">Próximos</h2>
            <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {upcoming.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {upcoming.map((saved) => (
              <EventCard
                key={saved.id}
                event={savedEventToRelax(saved)}
                savedEvents={savedEvents}
              />
            ))}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-muted-foreground">Pasados</h2>
            <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {past.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 opacity-60 sm:grid-cols-2">
            {past.map((saved) => (
              <EventCard
                key={saved.id}
                event={savedEventToRelax(saved)}
                savedEvents={savedEvents}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
