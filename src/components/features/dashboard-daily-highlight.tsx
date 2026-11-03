import Link from "next/link";

type HighlightType = "deal" | "event";

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
  highlight: DailyHighlightState | null;
}

function getHighlightConfig(type: HighlightType) {
  // deal + event share primary tints
  return {
    emoji: type === "deal" ? "🏷️" : "🎭",
    emojiBg: "bg-primary/10 dark:bg-primary/15",
    border: "border-primary/15 dark:border-primary/20",
    categoryColor: "text-primary",
    btnBg: "bg-primary hover:bg-primary/90 text-white",
  };
}

export function computeDailyHighlight(recommendedEvent?: RecommendedEvent | null): DailyHighlightState | null {
  if (!recommendedEvent) return null;

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

export function DashboardDailyHighlight({ highlight }: DashboardDailyHighlightProps) {
  if (!highlight) return null;

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
