import Link from "next/link";

type HighlightType = "deal" | "event" | "recipe";

interface DailyHighlightState {
  type: HighlightType;
  title: string;
  subtitle: string;
  categoryLabel: string;
  ctaLabel: string;
  ctaRoute: string;
}

interface RecommendedEvent {
  title: string;
  startDate?: string | null;
  venueName?: string | null;
  editorialHighlight?: string | null;
}

interface DashboardDailyHighlightProps {
  highlight: DailyHighlightState;
}

function getHighlightConfig(type: HighlightType) {
  if (type === "recipe") {
    return {
      emoji: "👨‍🍳",
      emojiBg: "bg-muted",
      border: "border-border",
      categoryColor: "text-muted-foreground",
      btnBg: "bg-foreground/10 hover:bg-foreground/15 text-foreground",
    };
  }
  // deal + event share primary tints
  return {
    emoji: type === "deal" ? "🏷️" : "🎭",
    emojiBg: "bg-primary/10 dark:bg-primary/15",
    border: "border-primary/15 dark:border-primary/20",
    categoryColor: "text-primary",
    btnBg: "bg-primary hover:bg-primary/90 text-white",
  };
}

function getMealLabel(): string {
  const hour = new Date().getHours();
  if (hour < 10) return "desayuno";
  if (hour < 15) return "almuerzo";
  if (hour < 19) return "merienda";
  return "cena";
}

export function computeDailyHighlight(recommendedEvent?: RecommendedEvent | null): DailyHighlightState {
  if (recommendedEvent) {
    const dateStr = recommendedEvent.startDate
      ? new Date(recommendedEvent.startDate).toLocaleDateString("es-AR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
      : null;
    const subtitle = recommendedEvent.editorialHighlight
      ?? [dateStr, recommendedEvent.venueName].filter(Boolean).join(" · ")
      ?? "Evento cerca tuyo";

    return {
      type: "event",
      title: recommendedEvent.title,
      subtitle,
      categoryLabel: "EVENTO",
      ctaLabel: "Ver evento",
      ctaRoute: "/descubrir",
    };
  }

  return {
    type: "recipe",
    title: `¿Qué cocinamos para el ${getMealLabel()}?`,
    subtitle: "Encontrá recetas con lo que tenés en casa",
    categoryLabel: "RECETA",
    ctaLabel: "Ver recetas",
    ctaRoute: "/cocina",
  };
}

export function DashboardDailyHighlight({ highlight }: DashboardDailyHighlightProps) {
  const config = getHighlightConfig(highlight.type);

  return (
    <Link
      href={highlight.ctaRoute}
      className={`block rounded-2xl border p-4 transition-all hover:shadow-md active:scale-[0.99] animate-fade-in ${config.border}`}
    >
      <div className="flex items-start gap-4">
        {/* Emoji circle */}
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${config.emojiBg}`}>
          {config.emoji}
        </div>

        <div className="min-w-0 flex-1">
          {/* Category */}
          <p className={`text-xs font-semibold uppercase tracking-wider ${config.categoryColor}`}>
            {highlight.categoryLabel}
          </p>
          {/* Title */}
          <p className="mt-1 text-base font-bold text-foreground">
            {highlight.title}
          </p>
          {/* Subtitle */}
          <p className="mt-0.5 text-sm text-muted-foreground">
            {highlight.subtitle}
          </p>
          {/* CTA */}
          <span className={`mt-2 inline-block rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${config.btnBg}`}>
            {highlight.ctaLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
