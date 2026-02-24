"use client";

import { useState, useEffect, useCallback, useMemo, type SyntheticEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Film,
  Drama,
  Music,
  Palette,
  UtensilsCrossed,
  PartyPopper,
  Paintbrush,
  Wine,
  Coffee,
  Beer,
  IceCream,
  Pizza,
  Zap,
  Flame,
  Footprints,
  Mountain,
  ShoppingBag,
  RefreshCw,
  ExternalLink,
  MapPin,
  Loader2,
  Sparkles,
  Info,
  AlertTriangle,
  Users,
  Lightbulb,
  Clock,
} from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useRelaxSuggestions, useRefreshRelaxSection } from "@/hooks/use-relax-suggestions";
import { useEvents } from "@/hooks/use-events";
import { cn } from "@/lib/utils";
import { radius, spacing, iconSize } from "@/lib/design-tokens";

import type { RelaxEvent, RelaxSection } from "@/lib/llm/relax-finder";
import type { LucideIcon } from "lucide-react";

// ============================================
// Types & constants
// ============================================

interface RelaxClientProps {
  aiEnabled: boolean;
  hasHouseholdLocation: boolean;
  householdCity: string | null;
  cachedActivitiesEvents: RelaxEvent[] | null;
  cachedActivitiesAt: string | null;
  /** Number of events in the platform DB (0 = use LLM fallback for activities) */
  platformEventCount: number;
}

interface CategoryConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

interface TabConfig {
  key: RelaxSection;
  label: string;
  icon: LucideIcon;
}

// Tab definitions
const TABS: TabConfig[] = [
  { key: "activities", label: "Qué hacer", icon: Sparkles },
  { key: "restaurants", label: "Dónde comer", icon: UtensilsCrossed },
];

// Category maps per section
const ACTIVITIES_CATEGORIES: Record<string, CategoryConfig> = {
  cine: { label: "Cine", icon: Film, color: "text-blue-600", bgColor: "bg-blue-100" },
  teatro: { label: "Teatro", icon: Drama, color: "text-purple-600", bgColor: "bg-purple-100" },
  musica: { label: "Música", icon: Music, color: "text-pink-600", bgColor: "bg-pink-100" },
  exposiciones: { label: "Exposiciones", icon: Palette, color: "text-amber-600", bgColor: "bg-amber-100" },
  festivales: { label: "Festivales", icon: PartyPopper, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  mercados: { label: "Mercados", icon: ShoppingBag, color: "text-amber-600", bgColor: "bg-amber-100" },
  paseos: { label: "Paseos", icon: Footprints, color: "text-green-600", bgColor: "bg-green-100" },
  excursiones: { label: "Excursiones", icon: Mountain, color: "text-teal-600", bgColor: "bg-teal-100" },
  talleres: { label: "Talleres", icon: Paintbrush, color: "text-orange-600", bgColor: "bg-orange-100" },
};

const RESTAURANT_CATEGORIES: Record<string, CategoryConfig> = {
  restaurantes: { label: "Restaurantes", icon: UtensilsCrossed, color: "text-orange-600", bgColor: "bg-orange-100" },
  bares: { label: "Bares", icon: Wine, color: "text-purple-600", bgColor: "bg-purple-100" },
  cafes: { label: "Cafés", icon: Coffee, color: "text-amber-600", bgColor: "bg-amber-100" },
  cervecerias: { label: "Cervecerías", icon: Beer, color: "text-yellow-600", bgColor: "bg-yellow-100" },
  heladerias: { label: "Heladerías", icon: IceCream, color: "text-pink-600", bgColor: "bg-pink-100" },
  pizzerias: { label: "Pizzerías", icon: Pizza, color: "text-red-600", bgColor: "bg-red-100" },
  comida_rapida: { label: "Rápida", icon: Zap, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  parrillas: { label: "Parrillas", icon: Flame, color: "text-rose-600", bgColor: "bg-rose-100" },
};

const SECTION_CATEGORIES: Record<RelaxSection, Record<string, CategoryConfig>> = {
  activities: ACTIVITIES_CATEGORIES,
  restaurants: RESTAURANT_CATEGORIES,
};

const SECTION_LOADING_MESSAGE: Record<RelaxSection, string> = {
  activities: "Buscando planes y actividades...",
  restaurants: "Buscando restaurantes y bares...",
};

// Meal period config: which restaurant categories to highlight per time of day
type MealPeriod = "breakfast" | "lunch" | "merienda" | "dinner";

const MEAL_PERIOD_CONFIG: Record<MealPeriod, { label: string; categories: string[] }> = {
  breakfast: { label: "Desayuno", categories: ["cafes"] },
  lunch: { label: "Almuerzo", categories: ["restaurantes", "parrillas", "pizzerias", "comida_rapida"] },
  merienda: { label: "Merienda", categories: ["cafes", "heladerias", "cervecerias"] },
  dinner: { label: "Cena", categories: ["restaurantes", "bares", "parrillas", "cervecerias", "pizzerias"] },
};

function getCurrentMealPeriod(): MealPeriod {
  const hour = new Date().getHours();
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 19) return "merienda";
  return "dinner";
}

// ============================================
// Component
// ============================================

export function RelaxClient({
  aiEnabled,
  hasHouseholdLocation,
  householdCity,
  cachedActivitiesEvents,
  cachedActivitiesAt,
  platformEventCount,
}: RelaxClientProps) {
  const { location, isLoading: isGeoLoading } = useGeolocation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const VALID_SECTIONS = new Set<RelaxSection>(["activities", "restaurants"]);
  const sectionParam = searchParams.get("section") as RelaxSection | null;
  const activeTab: RelaxSection = sectionParam && VALID_SECTIONS.has(sectionParam) ? sectionParam : "activities";

  const setActiveTab = useCallback(
    (tab: RelaxSection) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "activities") {
        params.delete("section");
      } else {
        params.set("section", tab);
      }
      const query = params.toString();
      router.replace(query ? `?${query}` : window.location.pathname, { scroll: false });
    },
    [router, searchParams],
  );

  // Track which tabs have been visited for lazy-loading
  const [visitedTabs, setVisitedTabs] = useState<Set<RelaxSection>>(
    new Set<RelaxSection>([activeTab])
  );

  // Category filter state per section
  const [activeCategoryBySection, setActiveCategoryBySection] = useState<
    Record<RelaxSection, string | null>
  >({
    activities: null,
    restaurants: null,
  });

  // Mark tab as visited when switched
  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  // Common query options shared across all sections
  const commonQueryOptions = useMemo(
    () => ({ location, isGeoLoading, hasHouseholdLocation, aiEnabled }),
    [location, isGeoLoading, hasHouseholdLocation, aiEnabled]
  );

  // Build initialData for activities from server pre-fetch (LLM fallback path)
  const activitiesInitialData = useMemo(() => {
    if (!cachedActivitiesEvents) return undefined;
    return {
      events: cachedActivitiesEvents,
      summary: "",
      generatedAt: cachedActivitiesAt ?? "",
    };
  }, [cachedActivitiesEvents, cachedActivitiesAt]);

  const activitiesInitialDataUpdatedAt = useMemo(
    () => (cachedActivitiesAt ? new Date(cachedActivitiesAt).getTime() : undefined),
    [cachedActivitiesAt]
  );

  const locationLabel = useMemo(() => {
    if (location && location.city) return location.city;
    if (householdCity) return householdCity;
    return null;
  }, [location, householdCity]);

  // Activities: prefer platform events DB when available, fall back to LLM
  const usePlatformEvents = platformEventCount > 0;

  const platformEventsQuery = useEvents({
    city: locationLabel ?? undefined,
    enabled: usePlatformEvents && visitedTabs.has("activities"),
  });

  const llmActivitiesQuery = useRelaxSuggestions({
    section: "activities",
    enabled: !usePlatformEvents && visitedTabs.has("activities"),
    initialData: activitiesInitialData,
    initialDataUpdatedAt: activitiesInitialDataUpdatedAt,
    ...commonQueryOptions,
  });

  // Stable ref for the platform path — no forceRefreshRef needed
  const platformForceRefreshRef = useMemo(() => ({ current: false }), []);

  // Unified view: platform query adapted to the same shape the rest of the component expects
  const activitiesQuery = useMemo(() => {
    if (usePlatformEvents) {
      return {
        data: platformEventsQuery.data
          ? { events: platformEventsQuery.data.events, summary: "", generatedAt: "" }
          : undefined,
        isFetching: platformEventsQuery.isFetching,
        error: platformEventsQuery.error,
        forceRefreshRef: platformForceRefreshRef,
      };
    }
    return llmActivitiesQuery;
  }, [usePlatformEvents, platformEventsQuery, llmActivitiesQuery, platformForceRefreshRef]);

  const restaurantsQuery = useRelaxSuggestions({
    section: "restaurants",
    enabled: visitedTabs.has("restaurants"),
    ...commonQueryOptions,
  });

  const queries = { activities: activitiesQuery, restaurants: restaurantsQuery };
  const currentQuery = queries[activeTab];
  const categories = SECTION_CATEGORIES[activeTab];
  const activeCategory = activeCategoryBySection[activeTab];

  // Refresh handler — invalidates the appropriate query based on active source
  const refreshSection = useRefreshRelaxSection();
  const handleRefresh = useCallback(() => {
    if (activeTab === "activities" && usePlatformEvents) {
      platformEventsQuery.refetch();
    } else {
      refreshSection(activeTab, currentQuery.forceRefreshRef);
    }
  }, [activeTab, usePlatformEvents, platformEventsQuery, currentQuery.forceRefreshRef, refreshSection]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    const events = currentQuery.data?.events;
    if (!events) return null;
    if (!activeCategory) return events;
    return events.filter((e) => e.category === activeCategory);
  }, [currentQuery.data?.events, activeCategory]);

  const mealPeriod = getCurrentMealPeriod();
  const mealConfig = MEAL_PERIOD_CONFIG[mealPeriod];
  const highlightedCategories = activeTab === "restaurants" ? new Set(mealConfig.categories) : null;

  const handleCategoryChange = useCallback(
    (category: string | null) => {
      setActiveCategoryBySection((prev) => ({
        ...prev,
        [activeTab]: category,
      }));
    },
    [activeTab]
  );

  // AI not enabled
  if (!aiEnabled) {
    return (
      <EmptyState
        icon={Info}
        title="IA no disponible"
        description="Las funciones de inteligencia artificial no estan configuradas. Contacta al administrador."
      />
    );
  }

  // No location available
  const hasGeo = !!(location && location.latitude !== 0 && location.longitude !== 0);
  if (!isGeoLoading && !hasGeo && !hasHouseholdLocation) {
    return (
      <EmptyState
        icon={MapPin}
        title="Ubicacion necesaria"
        description="Activa la geolocalizacion en tu navegador o configura la ubicacion de tu hogar en el perfil para recibir sugerencias."
      />
    );
  }

  const isLoading = currentQuery.isFetching && !currentQuery.data;
  const isRefreshing = currentQuery.isFetching && !!currentQuery.data;

  return (
    <div className={spacing.contentStack}>
      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === tab.key
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={iconSize.sm} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Location + refresh header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className={iconSize.sm} />
          {locationLabel ? (
            <span>{locationLabel}</span>
          ) : (
            <span>Detectando ubicacion...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentQuery.data?.generatedAt && (
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(currentQuery.data.generatedAt)}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={currentQuery.isFetching}
            className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn(iconSize.xs, currentQuery.isFetching && "animate-spin")} />
            {isRefreshing ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {/* Meal period indicator for restaurants */}
      {activeTab === "restaurants" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-primary">{mealConfig.label}</span>
          <span>— sugerencias adaptadas al horario</span>
        </div>
      )}

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <FilterPill
          label="Todas"
          isActive={activeCategory === null}
          onClick={() => handleCategoryChange(null)}
        />
        {Object.entries(categories).map(([key, config]) => {
          const Icon = config.icon;
          const isHighlighted = highlightedCategories?.has(key) ?? false;
          return (
            <FilterPill
              key={key}
              label={config.label}
              icon={<Icon className={iconSize.xs} />}
              isActive={activeCategory === key}
              isHighlighted={isHighlighted}
              onClick={() => handleCategoryChange(activeCategory === key ? null : key)}
            />
          );
        })}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            {SECTION_LOADING_MESSAGE[activeTab]}
          </p>
        </div>
      )}

      {/* Error state — full empty state when no data, inline banner when refresh fails with existing data */}
      {currentQuery.error && !currentQuery.data && (
        <EmptyState
          icon={Info}
          title="Error"
          description={currentQuery.error.message}
        />
      )}
      {currentQuery.error && currentQuery.data && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className={iconSize.sm} />
          No se pudo actualizar: {currentQuery.error.message}
        </div>
      )}

      {/* Events grid */}
      {filteredEvents && filteredEvents.length > 0 && (
        <div className={cn("grid grid-cols-1 sm:grid-cols-2", spacing.gridGap)}>
          {filteredEvents.map((event, index) => (
            <EventCard key={`${event.title}-${index}`} event={event} categories={categories} />
          ))}
        </div>
      )}

      {/* No results for filter */}
      {filteredEvents && filteredEvents.length === 0 && activeCategory && (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay sugerencias en esta categoria. Proba con otra o actualiza.
          </p>
        </div>
      )}

      {/* No results at all */}
      {currentQuery.data?.events && currentQuery.data.events.length === 0 && !activeCategory && (
        <EmptyState
          icon={Sparkles}
          title="Sin sugerencias"
          description="No encontramos sugerencias para tu zona. Proba actualizar mas tarde."
        />
      )}

    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function FilterPill({
  label,
  icon,
  isActive,
  isHighlighted,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  isHighlighted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "bg-primary text-white"
          : isHighlighted
            ? "bg-primary/15 text-primary ring-1 ring-primary/30 animate-pill-breathe"
            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function EventCard({
  event,
  categories,
}: {
  event: RelaxEvent;
  categories: Record<string, CategoryConfig>;
}) {
  const [imgError, setImgError] = useState(false);
  const config = categories[event.category];
  const Icon = config?.icon ?? Sparkles;
  const colorClass = config?.color ?? "text-primary";
  const bgColorClass = config?.bgColor ?? "bg-primary/10";
  const urgency = getTemporalUrgency(event.dateInfo);

  const handleImgError = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = "none";
    setImgError(true);
  }, []);

  return (
    <div className={cn(radius.card, "overflow-hidden border bg-white transition-shadow hover:shadow-md")}>
      {/* Banner image */}
      {event.imageUrl && !imgError && (
        <div className="relative h-36 w-full bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.imageUrl}
            alt={event.title}
            onError={handleImgError}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4">
        {/* Header: category + urgency + audience badges */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", bgColorClass, colorClass)}>
            <Icon className={iconSize.xs} />
            {config?.label ?? event.category}
          </div>
          {urgency && (
            <span className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
              urgency.style,
            )}>
              <Clock className={iconSize.xs} />
              {urgency.label}
            </span>
          )}
          {event.audience && event.audience.toLowerCase().includes("familia") && (
            <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Users className={iconSize.xs} />
              Familiar
            </span>
          )}
        </div>

        {/* Title — clickable if sourceUrl exists */}
        {event.sourceUrl ? (
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold leading-tight hover:underline"
          >
            {event.title}
          </a>
        ) : (
          <h3 className="text-sm font-semibold leading-tight">{event.title}</h3>
        )}

        {/* Venue + date + price in a compact block */}
        <div className="mt-1 space-y-0.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">{event.dateInfo}</span>
            <span className="rounded bg-muted/60 px-1.5 py-0.5 font-medium">{event.priceRange}</span>
          </div>
        </div>

        {/* Description */}
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {event.description}
        </p>

        {/* Tip — only if the LLM provided a concrete one */}
        {event.tip && (
          <div className="mt-2 flex gap-1.5 rounded-lg bg-amber-50 p-2">
            <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-amber-900">
              {event.tip}
            </p>
          </div>
        )}

        {/* Single CTA: directions */}
        {event.url && (
          <div className="mt-2">
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
            >
              <MapPin className="h-3 w-3" />
              Cómo llegar
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </div>
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
      <Icon className="h-10 w-10 text-foreground-tertiary" />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

interface TemporalUrgency {
  label: string;
  style: string;
}

/**
 * Parse dateInfo to determine temporal urgency for visual badges.
 * Matches common patterns: "Hoy", "Sáb 22 feb", "22 de febrero", etc.
 */
function getTemporalUrgency(dateInfo: string): TemporalUrgency | null {
  const lower = dateInfo.toLowerCase();

  if (lower.includes("hoy") || lower.includes("esta noche")) {
    return { label: "Hoy", style: "bg-red-100 text-red-700" };
  }
  if (lower.includes("mañana")) {
    return { label: "Mañana", style: "bg-orange-100 text-orange-700" };
  }

  // Try to detect "this weekend" — check if any date in the string falls within the next 3 days
  const now = new Date();
  const dayOfWeek = now.getDay();
  const isWeekendNearby = dayOfWeek === 0 || dayOfWeek >= 4;

  if (isWeekendNearby && (lower.includes("este fin de semana") || lower.includes("este finde"))) {
    return { label: "Este finde", style: "bg-orange-100 text-orange-700" };
  }

  // Try to extract a day number and month to calculate days until event
  const dayMonthMatch = lower.match(/(\d{1,2})\s+(?:de\s+)?(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/);
  if (dayMonthMatch) {
    const monthMap: Record<string, number> = {
      ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
      jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
    };
    const eventDay = parseInt(dayMonthMatch[1]!, 10);
    const eventMonth = monthMap[dayMonthMatch[2]!];
    if (eventMonth !== undefined) {
      const eventDate = new Date(now.getFullYear(), eventMonth, eventDay);
      const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil === 0) return { label: "Hoy", style: "bg-red-100 text-red-700" };
      if (daysUntil === 1) return { label: "Mañana", style: "bg-orange-100 text-orange-700" };
      if (daysUntil >= 2 && daysUntil <= 4) return { label: "Esta semana", style: "bg-amber-100 text-amber-700" };
      if (daysUntil >= 5 && daysUntil <= 10) return { label: "Próximos días", style: "bg-blue-100 text-blue-700" };
    }
  }

  return null;
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
