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

interface DashboardDailyHighlightProps {
  highlight: DailyHighlightState;
}

function getHighlightConfig(type: HighlightType) {
  switch (type) {
    case "deal":
      return {
        emoji: "🏷️",
        emojiBg: "bg-green-100 dark:bg-green-900/40",
        border: "border-green-200 dark:border-green-800/40",
        categoryColor: "text-green-700 dark:text-green-400",
        btnBg: "bg-green-600 hover:bg-green-700 text-white",
      };
    case "event":
      return {
        emoji: "🎭",
        emojiBg: "bg-violet-100 dark:bg-violet-900/40",
        border: "border-violet-200 dark:border-violet-800/40",
        categoryColor: "text-violet-700 dark:text-violet-400",
        btnBg: "bg-violet-600 hover:bg-violet-700 text-white",
      };
    case "recipe":
      return {
        emoji: "👨‍🍳",
        emojiBg: "bg-orange-100 dark:bg-orange-900/40",
        border: "border-orange-200 dark:border-orange-800/40",
        categoryColor: "text-orange-700 dark:text-orange-400",
        btnBg: "bg-orange-600 hover:bg-orange-700 text-white",
      };
  }
}

function getMealLabel(): string {
  const hour = new Date().getHours();
  if (hour < 10) return "desayuno";
  if (hour < 15) return "almuerzo";
  if (hour < 19) return "merienda";
  return "cena";
}

export function computeDailyHighlight(): DailyHighlightState {
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
      className={`block rounded-2xl border p-5 transition-all hover:shadow-md active:scale-[0.99] animate-fade-in ${config.border}`}
    >
      <div className="flex items-start gap-4">
        {/* Emoji circle */}
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${config.emojiBg}`}>
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
          <span className={`mt-3 inline-block rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${config.btnBg}`}>
            {highlight.ctaLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
