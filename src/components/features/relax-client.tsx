"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Film,
  Drama,
  Music,
  Palette,
  UtensilsCrossed,
  PartyPopper,
  Dumbbell,
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
  TreePine,
  Sandwich,
  Camera,
  RefreshCw,
  ExternalLink,
  MapPin,
  Loader2,
  Sparkles,
  Info,
  Users,
  Lightbulb,
  Compass,
} from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
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
  cachedCultureEvents: RelaxEvent[] | null;
  cachedCultureAt: string | null;
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

interface SectionState {
  events: RelaxEvent[] | null;
  generatedAt: string | null;
  isGenerating: boolean;
  fetchError: string | null;
  activeCategory: string | null;
  hasFetched: boolean;
}

// Tab definitions
const TABS: TabConfig[] = [
  { key: "culture", label: "Cultura", icon: Sparkles },
  { key: "restaurants", label: "Restaurantes", icon: UtensilsCrossed },
  { key: "weekend", label: "Weekend", icon: Compass },
];

// Category maps per section
const CULTURE_CATEGORIES: Record<string, CategoryConfig> = {
  cine: { label: "Cine", icon: Film, color: "text-blue-600", bgColor: "bg-blue-100" },
  teatro: { label: "Teatro", icon: Drama, color: "text-purple-600", bgColor: "bg-purple-100" },
  musica: { label: "Musica", icon: Music, color: "text-pink-600", bgColor: "bg-pink-100" },
  exposiciones: { label: "Exposiciones", icon: Palette, color: "text-amber-600", bgColor: "bg-amber-100" },
  gastronomia: { label: "Gastronomia", icon: UtensilsCrossed, color: "text-orange-600", bgColor: "bg-orange-100" },
  festivales: { label: "Festivales", icon: PartyPopper, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  deportes_culturales: { label: "Deportes", icon: Dumbbell, color: "text-red-600", bgColor: "bg-red-100" },
  talleres: { label: "Talleres", icon: Paintbrush, color: "text-teal-600", bgColor: "bg-teal-100" },
};

const RESTAURANT_CATEGORIES: Record<string, CategoryConfig> = {
  restaurantes: { label: "Restaurantes", icon: UtensilsCrossed, color: "text-orange-600", bgColor: "bg-orange-100" },
  bares: { label: "Bares", icon: Wine, color: "text-purple-600", bgColor: "bg-purple-100" },
  cafes: { label: "Cafes", icon: Coffee, color: "text-amber-600", bgColor: "bg-amber-100" },
  cervecerias: { label: "Cervecerias", icon: Beer, color: "text-yellow-600", bgColor: "bg-yellow-100" },
  heladerias: { label: "Heladerias", icon: IceCream, color: "text-pink-600", bgColor: "bg-pink-100" },
  pizzerias: { label: "Pizzerias", icon: Pizza, color: "text-red-600", bgColor: "bg-red-100" },
  comida_rapida: { label: "Rapida", icon: Zap, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  parrillas: { label: "Parrillas", icon: Flame, color: "text-rose-600", bgColor: "bg-rose-100" },
};

const WEEKEND_CATEGORIES: Record<string, CategoryConfig> = {
  paseos: { label: "Paseos", icon: Footprints, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  excursiones: { label: "Excursiones", icon: Mountain, color: "text-green-600", bgColor: "bg-green-100" },
  mercados: { label: "Mercados", icon: ShoppingBag, color: "text-amber-600", bgColor: "bg-amber-100" },
  parques: { label: "Parques", icon: TreePine, color: "text-lime-600", bgColor: "bg-lime-100" },
  deportes: { label: "Deportes", icon: Dumbbell, color: "text-blue-600", bgColor: "bg-blue-100" },
  picnic: { label: "Picnic", icon: Sandwich, color: "text-orange-600", bgColor: "bg-orange-100" },
  turismo: { label: "Turismo", icon: Camera, color: "text-purple-600", bgColor: "bg-purple-100" },
  familiar: { label: "Familiar", icon: Users, color: "text-pink-600", bgColor: "bg-pink-100" },
};

const SECTION_CATEGORIES: Record<RelaxSection, Record<string, CategoryConfig>> = {
  culture: CULTURE_CATEGORIES,
  restaurants: RESTAURANT_CATEGORIES,
  weekend: WEEKEND_CATEGORIES,
};

const SECTION_LOADING_MESSAGE: Record<RelaxSection, string> = {
  culture: "Buscando actividades culturales...",
  restaurants: "Buscando restaurantes y bares...",
  weekend: "Buscando planes para el finde...",
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

function createEmptyState(): SectionState {
  return {
    events: null,
    generatedAt: null,
    isGenerating: false,
    fetchError: null,
    activeCategory: null,
    hasFetched: false,
  };
}

// ============================================
// Component
// ============================================

export function RelaxClient({
  aiEnabled,
  hasHouseholdLocation,
  householdCity,
  cachedCultureEvents,
  cachedCultureAt,
}: RelaxClientProps) {
  const { location, isLoading: isGeoLoading } = useGeolocation();
  const [activeTab, setActiveTab] = useState<RelaxSection>("culture");

  const [sectionStates, setSectionStates] = useState<Record<RelaxSection, SectionState>>({
    culture: {
      ...createEmptyState(),
      events: cachedCultureEvents,
      generatedAt: cachedCultureAt,
      hasFetched: !!cachedCultureEvents,
    },
    restaurants: createEmptyState(),
    weekend: createEmptyState(),
  });

  const currentState = sectionStates[activeTab];
  const categories = SECTION_CATEGORIES[activeTab];

  const fetchSuggestions = useCallback(
    async (section: RelaxSection, forceRefresh = false) => {
      setSectionStates((prev) => ({
        ...prev,
        [section]: { ...prev[section], isGenerating: true, fetchError: null },
      }));

      try {
        const body: Record<string, unknown> = { section, forceRefresh };

        if (location && location.latitude !== 0 && location.longitude !== 0) {
          body.latitude = location.latitude;
          body.longitude = location.longitude;
          body.city = location.city;
          body.country = location.country;
          body.timezone = location.timezone;
        }

        const response = await fetch("/api/ai/relax-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Error al obtener sugerencias");
        }

        const data = (await response.json()) as {
          events: RelaxEvent[];
          generatedAt: string;
        };

        setSectionStates((prev) => ({
          ...prev,
          [section]: {
            ...prev[section],
            events: data.events,
            generatedAt: data.generatedAt,
            isGenerating: false,
            hasFetched: true,
          },
        }));
      } catch (err) {
        setSectionStates((prev) => ({
          ...prev,
          [section]: {
            ...prev[section],
            fetchError: err instanceof Error ? err.message : "Error desconocido",
            isGenerating: false,
            hasFetched: true,
          },
        }));
      }
    },
    [location]
  );

  // Lazy-fetch when tab changes and geo is ready
  useEffect(() => {
    const state = sectionStates[activeTab];
    if (state.hasFetched || state.isGenerating || !aiEnabled) return;
    if (isGeoLoading) return;

    const hasGeo = location && location.latitude !== 0 && location.longitude !== 0;
    if (hasGeo || hasHouseholdLocation) {
      fetchSuggestions(activeTab);
    }
  }, [activeTab, isGeoLoading, location, hasHouseholdLocation, aiEnabled, sectionStates, fetchSuggestions]);

  const filteredEvents = useMemo(() => {
    if (!currentState.events) return null;
    if (!currentState.activeCategory) return currentState.events;
    return currentState.events.filter((e) => e.category === currentState.activeCategory);
  }, [currentState.events, currentState.activeCategory]);

  const locationLabel = useMemo(() => {
    if (location && location.city) return location.city;
    if (householdCity) return householdCity;
    return null;
  }, [location, householdCity]);

  const mealPeriod = useMemo(() => getCurrentMealPeriod(), []);
  const mealConfig = MEAL_PERIOD_CONFIG[mealPeriod];
  const highlightedCategories = useMemo(
    () => (activeTab === "restaurants" ? new Set(mealConfig.categories) : null),
    [activeTab, mealConfig.categories]
  );

  const handleCategoryChange = useCallback(
    (category: string | null) => {
      setSectionStates((prev) => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], activeCategory: category },
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
  const hasGeo = location && location.latitude !== 0 && location.longitude !== 0;
  if (!isGeoLoading && !hasGeo && !hasHouseholdLocation) {
    return (
      <EmptyState
        icon={MapPin}
        title="Ubicacion necesaria"
        description="Activa la geolocalizacion en tu navegador o configura la ubicacion de tu hogar en el perfil para recibir sugerencias."
      />
    );
  }

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
                "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
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
          {currentState.generatedAt && (
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(currentState.generatedAt)}
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchSuggestions(activeTab, true)}
            disabled={currentState.isGenerating}
            className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn(iconSize.xs, currentState.isGenerating && "animate-spin")} />
            Actualizar
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
          isActive={currentState.activeCategory === null}
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
              isActive={currentState.activeCategory === key}
              isHighlighted={isHighlighted}
              onClick={() => handleCategoryChange(currentState.activeCategory === key ? null : key)}
            />
          );
        })}
      </div>

      {/* Loading state */}
      {currentState.isGenerating && !currentState.events && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            {SECTION_LOADING_MESSAGE[activeTab]}
          </p>
        </div>
      )}

      {/* Error state */}
      {currentState.fetchError && !currentState.events && (
        <EmptyState
          icon={Info}
          title="Error"
          description={currentState.fetchError}
        />
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
      {filteredEvents && filteredEvents.length === 0 && currentState.activeCategory && (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay sugerencias en esta categoria. Proba con otra o actualiza.
          </p>
        </div>
      )}

      {/* No results at all */}
      {currentState.events && currentState.events.length === 0 && !currentState.activeCategory && (
        <EmptyState
          icon={Sparkles}
          title="Sin sugerencias"
          description="No encontramos sugerencias para tu zona. Proba actualizar mas tarde."
        />
      )}

      {/* Generating overlay when refreshing with existing results */}
      {currentState.isGenerating && currentState.events && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Actualizando sugerencias...</p>
          </div>
        </div>
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
        "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
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
  const config = categories[event.category];
  const Icon = config?.icon ?? Sparkles;
  const colorClass = config?.color ?? "text-primary";
  const bgColorClass = config?.bgColor ?? "bg-primary/10";

  return (
    <div className={cn(radius.card, "border bg-white p-4 transition-shadow hover:shadow-md")}>
      {/* Header: category badge + family badge */}
      <div className="mb-2 flex items-center justify-between">
        <div className={cn("flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", bgColorClass, colorClass)}>
          <Icon className={iconSize.xs} />
          {config?.label ?? event.category}
        </div>
        <div className="flex items-center gap-1.5">
          {event.familyFriendly && (
            <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Users className={iconSize.xs} />
              Familiar
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold leading-tight">{event.title}</h3>

      {/* Venue + distance */}
      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="truncate">{event.venue}</span>
        {event.distanceKm != null && (
          <span className="ml-auto shrink-0 rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium">
            {formatDistance(event.distanceKm)}
          </span>
        )}
      </div>

      {/* Date + price */}
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">{event.dateInfo}</span>
        <span className="rounded bg-muted/60 px-1.5 py-0.5 font-medium">{event.priceRange}</span>
      </div>

      {/* Description */}
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {event.description}
      </p>

      {/* Relevance note */}
      <p className="mt-1.5 text-[11px] italic text-muted-foreground/70">
        {event.relevanceNote}
      </p>

      {/* Practical tips */}
      {event.practicalTips && (
        <div className="mt-2 flex gap-1.5 rounded-lg bg-amber-50 p-2">
          <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-amber-900">
            {event.practicalTips}
          </p>
        </div>
      )}

      {/* Verification link — always visible */}
      {event.url && (
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
        >
          <MapPin className="h-3 w-3" />
          Verificar en Google Maps
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
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
      <Icon className="h-10 w-10 text-muted-foreground/40" />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
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
