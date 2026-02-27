"use client";

import { useState, useCallback, useMemo } from "react";
import {
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
} from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useRelaxSuggestions, useRefreshRelaxSection } from "@/hooks/use-relax-suggestions";
import { cn } from "@/lib/utils";
import { radius, spacing, iconSize, typography, animation } from "@/lib/design-tokens";

import type { RelaxEvent, RelaxSection } from "@/lib/events/types";
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
  muestras: { label: "Muestras", icon: Palette, sectionHeader: "Para ver" },
  ferias: { label: "Ferias", icon: PartyPopper, sectionHeader: "Para visitar" },
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

const ACTIVITIES_CATEGORY_ORDER = ["cine", "teatro", "musica", "muestras", "ferias"];
const RESTAURANTS_CATEGORY_ORDER = ["restaurantes", "bares", "cafes", "cervecerias", "heladerias", "pizzerias", "comida_rapida", "parrillas"];

const SECTION_CATEGORY_ORDER: Record<RelaxSection, string[]> = {
  activities: ACTIVITIES_CATEGORY_ORDER,
  restaurants: RESTAURANTS_CATEGORY_ORDER,
};

/** Categories that represent restaurants/gastronomic venues (no calendar link). */
const RESTAURANT_CATEGORY_SET = new Set(RESTAURANTS_CATEGORY_ORDER);

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

const CATEGORY_COLORS: Record<string, CategoryColorSet> = {
  cine: {
    cardBg: "bg-violet-100",
    cardBorder: "border-violet-300",
    iconBg: "bg-violet-200",
    iconColor: "text-violet-700",
    pillActiveBg: "bg-violet-600",
    pillActiveText: "text-white",
    chipBg: "bg-violet-200/80",
    chipText: "text-violet-800",
  },
  teatro: {
    cardBg: "bg-orange-100",
    cardBorder: "border-orange-300",
    iconBg: "bg-orange-200",
    iconColor: "text-orange-700",
    pillActiveBg: "bg-orange-600",
    pillActiveText: "text-white",
    chipBg: "bg-orange-200/80",
    chipText: "text-orange-800",
  },
  musica: {
    cardBg: "bg-pink-100",
    cardBorder: "border-pink-300",
    iconBg: "bg-pink-200",
    iconColor: "text-pink-700",
    pillActiveBg: "bg-pink-600",
    pillActiveText: "text-white",
    chipBg: "bg-pink-200/80",
    chipText: "text-pink-800",
  },
  muestras: {
    cardBg: "bg-emerald-100",
    cardBorder: "border-emerald-300",
    iconBg: "bg-emerald-200",
    iconColor: "text-emerald-700",
    pillActiveBg: "bg-emerald-600",
    pillActiveText: "text-white",
    chipBg: "bg-emerald-200/80",
    chipText: "text-emerald-800",
  },
  ferias: {
    cardBg: "bg-amber-100",
    cardBorder: "border-amber-300",
    iconBg: "bg-amber-200",
    iconColor: "text-amber-700",
    pillActiveBg: "bg-amber-600",
    pillActiveText: "text-white",
    chipBg: "bg-amber-200/80",
    chipText: "text-amber-800",
  },
  // Restaurant categories
  restaurantes: {
    cardBg: "bg-rose-100",
    cardBorder: "border-rose-300",
    iconBg: "bg-rose-200",
    iconColor: "text-rose-700",
    pillActiveBg: "bg-rose-600",
    pillActiveText: "text-white",
    chipBg: "bg-rose-200/80",
    chipText: "text-rose-800",
  },
  bares: {
    cardBg: "bg-indigo-100",
    cardBorder: "border-indigo-300",
    iconBg: "bg-indigo-200",
    iconColor: "text-indigo-700",
    pillActiveBg: "bg-indigo-600",
    pillActiveText: "text-white",
    chipBg: "bg-indigo-200/80",
    chipText: "text-indigo-800",
  },
  cafes: {
    cardBg: "bg-yellow-100",
    cardBorder: "border-yellow-300",
    iconBg: "bg-yellow-200",
    iconColor: "text-yellow-700",
    pillActiveBg: "bg-yellow-600",
    pillActiveText: "text-white",
    chipBg: "bg-yellow-200/80",
    chipText: "text-yellow-800",
  },
  cervecerias: {
    cardBg: "bg-amber-100",
    cardBorder: "border-amber-300",
    iconBg: "bg-amber-200",
    iconColor: "text-amber-700",
    pillActiveBg: "bg-amber-600",
    pillActiveText: "text-white",
    chipBg: "bg-amber-200/80",
    chipText: "text-amber-800",
  },
  heladerias: {
    cardBg: "bg-sky-100",
    cardBorder: "border-sky-300",
    iconBg: "bg-sky-200",
    iconColor: "text-sky-700",
    pillActiveBg: "bg-sky-600",
    pillActiveText: "text-white",
    chipBg: "bg-sky-200/80",
    chipText: "text-sky-800",
  },
  pizzerias: {
    cardBg: "bg-orange-100",
    cardBorder: "border-orange-300",
    iconBg: "bg-orange-200",
    iconColor: "text-orange-700",
    pillActiveBg: "bg-orange-600",
    pillActiveText: "text-white",
    chipBg: "bg-orange-200/80",
    chipText: "text-orange-800",
  },
  comida_rapida: {
    cardBg: "bg-lime-100",
    cardBorder: "border-lime-300",
    iconBg: "bg-lime-200",
    iconColor: "text-lime-700",
    pillActiveBg: "bg-lime-600",
    pillActiveText: "text-white",
    chipBg: "bg-lime-200/80",
    chipText: "text-lime-800",
  },
  parrillas: {
    cardBg: "bg-red-100",
    cardBorder: "border-red-300",
    iconBg: "bg-red-200",
    iconColor: "text-red-700",
    pillActiveBg: "bg-red-600",
    pillActiveText: "text-white",
    chipBg: "bg-red-200/80",
    chipText: "text-red-800",
  },
};

const DEFAULT_CATEGORY_COLOR: CategoryColorSet = {
  cardBg: "bg-muted/40",
  cardBorder: "border-border",
  iconBg: "bg-muted",
  iconColor: "text-muted-foreground",
  pillActiveBg: "bg-primary",
  pillActiveText: "text-white",
  chipBg: "bg-muted/70",
  chipText: "text-muted-foreground",
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
  return CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR;
}

function getCategoryLabel(event: RelaxEvent): string {
  if (event.culturalCategory) return event.culturalCategory;
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

/** Build a Google Calendar "add event" URL from RelaxEvent data. */
function buildCalendarUrl(event: RelaxEvent): string | null {
  // dateInfo is formatted like "Sáb 1 mar, 21:00" — we need to parse it back
  // Since we don't have raw dates on the client, use dateInfo as the event time text
  const title = encodeURIComponent(event.title);
  const location = encodeURIComponent(event.venue);
  const details = encodeURIComponent(
    [event.description, event.sourceUrl ? `Más info: ${event.sourceUrl}` : ""]
      .filter(Boolean)
      .join("\n\n"),
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&location=${location}&details=${details}`;
}

// ============================================
// Temporal bucketing
// ============================================

interface TemporalBucket {
  key: string;
  label: string;
  events: RelaxEvent[];
}

/** Group events into temporal buckets: Hoy → Esta semana → Fin de semana → Próximamente. */
function bucketByDate(events: RelaxEvent[]): TemporalBucket[] {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA");
  const today = new Date(`${todayStr}T00:00:00`);

  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  // Next Saturday 00:00
  const dayOfWeek = today.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
  // Monday 00:00 after the weekend
  const nextMondayAfterWeekend = new Date(nextSaturday);
  nextMondayAfterWeekend.setDate(nextSaturday.getDate() + 2);

  const todayBucket: RelaxEvent[] = [];
  const weekBucket: RelaxEvent[] = [];
  const weekendBucket: RelaxEvent[] = [];
  const laterBucket: RelaxEvent[] = [];

  for (const event of events) {
    if (!event.startDate) continue;
    const eventDate = new Date(event.startDate);
    const eventDay = eventDate.toLocaleDateString("en-CA");

    if (eventDay === todayStr) {
      todayBucket.push(event);
    } else if (eventDate >= nextSaturday && eventDate < nextMondayAfterWeekend) {
      weekendBucket.push(event);
    } else if (eventDate < weekEnd) {
      weekBucket.push(event);
    } else {
      laterBucket.push(event);
    }
  }

  // Sort each bucket by startDate ASC
  const sortByDate = (a: RelaxEvent, b: RelaxEvent) => {
    if (!a.startDate || !b.startDate) return 0;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  };
  todayBucket.sort(sortByDate);
  weekBucket.sort(sortByDate);
  weekendBucket.sort(sortByDate);
  laterBucket.sort(sortByDate);

  const buckets: TemporalBucket[] = [];
  if (todayBucket.length > 0) buckets.push({ key: "today", label: "Hoy", events: todayBucket });
  if (weekBucket.length > 0) buckets.push({ key: "week", label: "Esta semana", events: weekBucket });
  if (weekendBucket.length > 0) buckets.push({ key: "weekend", label: "Fin de semana", events: weekendBucket });
  if (laterBucket.length > 0) buckets.push({ key: "later", label: "Próximamente", events: laterBucket });
  return buckets;
}

/** Group events by category (for restaurants tab). */
function bucketByCategory(events: RelaxEvent[], categoryOrder: string[]): TemporalBucket[] {
  const groups = new Map<string, RelaxEvent[]>();
  for (const event of events) {
    const existing = groups.get(event.category);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(event.category, [event]);
    }
  }

  return categoryOrder
    .filter((key) => groups.has(key))
    .map((key) => ({
      key,
      label: CATEGORIES[key]?.sectionHeader ?? key,
      events: groups.get(key)!,
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
  const [activeSection, setActiveSection] = useState<RelaxSection>("activities");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);

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
  const activitiesQuery = useRelaxSuggestions({
    section: "activities",
    enabled: true,
    initialData,
    initialDataUpdatedAt: initialEvents.length > 0 ? Date.now() : undefined,
    location,
    isGeoLoading,
    hasHouseholdLocation,
  });

  // Restaurants query — lazy-loaded on first tab visit
  const [restaurantsVisited, setRestaurantsVisited] = useState(false);
  const restaurantsQuery = useRelaxSuggestions({
    section: "restaurants",
    enabled: restaurantsVisited,
    location,
    isGeoLoading,
    hasHouseholdLocation,
  });

  const query = activeSection === "activities" ? activitiesQuery : restaurantsQuery;
  const categoryOrder = SECTION_CATEGORY_ORDER[activeSection];

  const handleTabChange = useCallback((section: RelaxSection) => {
    setActiveSection(section);
    setActiveCategory(null);
    if (section === "restaurants") {
      setRestaurantsVisited(true);
    }
  }, []);

  const refreshSection = useRefreshRelaxSection();
  const handleRefresh = useCallback(async () => {
    setIsPipelineRunning(true);
    try {
      await refreshSection("activities", activitiesQuery.forceRefreshRef);
    } finally {
      setIsPipelineRunning(false);
    }
  }, [activitiesQuery.forceRefreshRef, refreshSection]);

  // Split: recommended events + rest bucketed by time
  const { recommendedEvents, temporalBuckets, visibleCategories } = useMemo(() => {
    const events = query.data?.events;
    if (!events || events.length === 0) {
      return {
        recommendedEvents: [] as RelaxEvent[],
        temporalBuckets: [] as TemporalBucket[],
        visibleCategories: [] as string[],
      };
    }

    // 1. Extract recommended events (activities only, pipeline-scored)
    const recommended: RelaxEvent[] = [];
    const remaining: RelaxEvent[] = [];

    for (const event of events) {
      const isRecommended =
        activeSection === "activities" &&
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

    // 2. Bucket remaining events by date (activities) or category (restaurants)
    const buckets = activeSection === "activities"
      ? bucketByDate(remaining)
      : bucketByCategory(remaining, categoryOrder);

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
    const visible = categoryOrder.filter((key) => categorySet.has(key));

    return { recommendedEvents: recommended, temporalBuckets: buckets, visibleCategories: visible };
  }, [query.data?.events, activeSection, categoryOrder]);

  // Apply category filter across all temporal buckets
  const displayBuckets = useMemo(() => {
    if (!activeCategory) return temporalBuckets;
    return temporalBuckets
      .map((bucket) => ({
        ...bucket,
        events: bucket.events.filter((e) => e.category === activeCategory),
      }))
      .filter((bucket) => bucket.events.length > 0);
  }, [temporalBuckets, activeCategory]);

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
  const hasEvents = (query.data?.events?.length ?? 0) > 0;

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
        {activeSection === "activities" && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isBusy}
            className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn(iconSize.xs, isBusy && "animate-spin")} />
            {isPipelineRunning ? "Buscando eventos..." : isRefreshing ? "Actualizando..." : "Actualizar"}
          </button>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 rounded-full bg-muted/60 p-1">
        <TabButton
          label="Planes"
          isActive={activeSection === "activities"}
          onClick={() => handleTabChange("activities")}
        />
        <TabButton
          label="Dónde comer"
          isActive={activeSection === "restaurants"}
          onClick={() => handleTabChange("restaurants")}
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            {activeSection === "restaurants"
              ? "Buscando restaurantes y bares..."
              : isPipelineRunning
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
          description={activeSection === "restaurants"
            ? "No pudimos cargar los restaurantes. Intentá en unos minutos."
            : "No pudimos cargar los planes. Intentá en unos minutos."}
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
              />
            ))}
          </div>
        </section>
      )}

      {/* Category filter pills */}
      {visibleCategories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <FilterPill
            label="Todas"
            isActive={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          />
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
      )}

      {/* Temporal / category sections */}
      {hasEvents && (
        <div className="space-y-6">
          {displayBuckets.map((bucket) => (
            <TemporalSection
              key={bucket.key}
              label={bucket.label}
              events={bucket.events}
            />
          ))}
        </div>
      )}

      {/* No results */}
      {query.data?.events && query.data.events.length === 0 && (
        <EmptyState
          icon={Info}
          title={activeSection === "restaurants" ? "Sin resultados" : "Sin planes por hoy"}
          description={activeSection === "restaurants"
            ? "No encontramos restaurantes cerca. Intentá más tarde."
            : "No encontramos planes para hoy. Volvé mañana."}
        />
      )}
    </div>
  );
}

// ============================================
// Highlighted event card (Destacados)
// ============================================

function HighlightedEventCard({ event, colorIndex }: { event: RelaxEvent; colorIndex: number }) {
  const gradient = HIGHLIGHT_GRADIENTS[colorIndex % HIGHLIGHT_GRADIENTS.length]!;
  const colors = getCategoryColors(event.category);
  const isRestaurant = RESTAURANT_CATEGORY_SET.has(event.category);
  const calendarUrl = isRestaurant ? null : buildCalendarUrl(event);

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
      {/* Category chip + star */}
      <div className="flex items-center justify-between">
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
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
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

function TemporalSection({
  label,
  events,
}: {
  label: string;
  events: RelaxEvent[];
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
          "flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-proximity -mx-4 px-4",
          "sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:items-stretch sm:overflow-visible sm:snap-none",
        )}
      >
        {events.map((event, index) => (
          <div
            key={`${event.title}-${index}`}
            className="w-[260px] shrink-0 snap-start sm:w-auto sm:shrink sm:h-auto"
          >
            <EventCard event={event} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// Event card (regular)
// ============================================

function EventCard({ event }: { event: RelaxEvent }) {
  const colors = getCategoryColors(event.category);
  const isRestaurant = RESTAURANT_CATEGORY_SET.has(event.category);
  const calendarUrl = isRestaurant ? null : buildCalendarUrl(event);

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
        "flex h-full flex-col border p-4 transition-all",
        colors.cardBg,
        colors.cardBorder,
        animation.hoverScaleSubtle,
        "hover:shadow-md",
      )}
    >
      {/* Category chip */}
      <span
        className={cn(
          "inline-flex items-center gap-1 self-start rounded-full px-2.5 py-0.5",
          "text-[11px] font-bold uppercase tracking-wide",
          colors.chipBg,
          colors.chipText,
        )}
      >
        {getCategoryLabel(event)}
      </span>

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
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                colors.chipBg,
                colors.chipText,
                "hover:brightness-95",
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

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

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
  const colors = categoryKey ? CATEGORY_COLORS[categoryKey] : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive && colors
          ? cn(colors.pillActiveBg, colors.pillActiveText)
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
