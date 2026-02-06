"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  Clock,
  Lightbulb,
  ListTodo,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  Loader2,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestionItem {
  type: "hero" | "chip" | "tip" | "action";
  title: string;
  description?: string;
  priority?: "high" | "medium" | "low";
  icon?: string;
  actionLabel?: string;
  actionHref?: string;
}

interface SuggestionsResponse {
  headline: string;
  subheadline?: string;
  items: SuggestionItem[];
  contextSummary: string;
}

interface SuggestionsPageClientProps {
  memberName: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "alert-triangle": AlertTriangle,
  "calendar-days": CalendarDays,
  "check-circle": CheckCircle,
  clock: Clock,
  lightbulb: Lightbulb,
  "list-todo": ListTodo,
  sun: Sun,
  moon: Moon,
  sunrise: Sunrise,
  sunset: Sunset,
  home: Home,
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-50 dark:bg-red-950",
  medium: "bg-amber-50 dark:bg-amber-950",
  low: "bg-green-50 dark:bg-green-950",
};

const PRIORITY_ICON_BG: Record<string, string> = {
  high: "bg-red-100 dark:bg-red-900",
  medium: "bg-amber-100 dark:bg-amber-900",
  low: "bg-green-100 dark:bg-green-900",
};

const PRIORITY_TEXT: Record<string, string> = {
  high: "text-red-800 dark:text-red-200",
  medium: "text-amber-800 dark:text-amber-200",
  low: "text-green-800 dark:text-green-200",
};

function getIcon(iconName?: string, className?: string) {
  if (!iconName) return null;
  const IconComponent = ICON_MAP[iconName];
  return IconComponent ? <IconComponent className={className ?? "h-5 w-5"} /> : null;
}

export function SuggestionsPageClient({ memberName }: SuggestionsPageClientProps) {
  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/suggestions");

      if (!response.ok) {
        throw new Error("Failed to fetch");
      }

      const result = (await response.json()) as SuggestionsResponse;
      setData(result);
    } catch (err) {
      console.error("Error:", err);
      setError("fetch_error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const heroItem = data?.items.find((i) => i.type === "hero");
  const chips = data?.items.filter((i) => i.type === "chip") ?? [];
  const tips = data?.items.filter((i) => i.type === "tip") ?? [];
  const actions = data?.items.filter((i) => i.type === "action") ?? [];

  return (
    <div className="container max-w-2xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Sugerencias
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Recomendaciones personalizadas para tu hogar
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSuggestions}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualizar
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && !data && (
        <div className="rounded-2xl bg-[#e4d5ff]/40 p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analizando tu hogar...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-[#fff0d7] p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No se pudieron cargar las sugerencias
            </p>
            <Button onClick={fetchSuggestions}>Reintentar</Button>
          </div>
        </div>
      )}

      {/* Content */}
      {data && !isLoading && (
        <div className="space-y-6">
          {/* Headline card */}
          <div className="rounded-2xl bg-[#e4d5ff]/40 p-6">
            <h2 className="text-2xl font-bold">{data.headline}</h2>
            {data.subheadline && (
              <p className="text-muted-foreground mt-1">{data.subheadline}</p>
            )}
            <p className="text-xs text-muted-foreground mt-4 opacity-60">
              {data.contextSummary}
            </p>
          </div>

          {/* Hero item (priority alert) */}
          {heroItem && (
            <div className={cn(
              "rounded-2xl p-5",
              heroItem.priority ? PRIORITY_STYLES[heroItem.priority] : "bg-muted/30"
            )}>
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "rounded-full p-2",
                    heroItem.priority ? PRIORITY_ICON_BG[heroItem.priority] : "bg-muted"
                  )}
                >
                  {getIcon(heroItem.icon, "h-6 w-6")}
                </div>
                <div className="flex-1">
                  <h3
                    className={cn(
                      "text-lg font-semibold",
                      heroItem.priority ? PRIORITY_TEXT[heroItem.priority] : ""
                    )}
                  >
                    {heroItem.title}
                  </h3>
                  {heroItem.description && (
                    <p className="text-sm mt-1 opacity-80">{heroItem.description}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status chips */}
          {chips.length > 0 && (
            <div className="rounded-2xl bg-[#d2ffa0]/30 p-5">
              <h3 className="text-base font-semibold mb-3">Estado actual</h3>
              <div className="flex flex-wrap gap-2">
                {chips.map((chip, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="gap-2 py-1.5 px-3 text-sm"
                  >
                    {getIcon(chip.icon, "h-4 w-4")}
                    <span className="font-medium">{chip.title}</span>
                    {chip.description && (
                      <span className="text-muted-foreground font-normal">
                        {chip.description}
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {tips.length > 0 && (
            <div className="rounded-2xl bg-[#fff0d7]/60 p-5">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Consejos
              </h3>
              <div className="space-y-3">
                {tips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-white/50 p-3"
                  >
                    <p className="font-medium">{tip.title}</p>
                    {tip.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {tip.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="rounded-2xl bg-[#d0b6ff]/20 p-5">
              <h3 className="text-base font-semibold mb-3">Acciones sugeridas</h3>
              <div className="space-y-2">
                {actions.map((action, idx) => (
                  <Link
                    key={idx}
                    href={action.actionHref ?? "#"}
                    className="flex items-center justify-between rounded-2xl bg-white/50 p-4 hover:bg-white/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        {getIcon(action.icon, "h-5 w-5 text-primary")}
                      </div>
                      <div>
                        <p className="font-medium">{action.title}</p>
                        {action.description && (
                          <p className="text-sm text-muted-foreground">
                            {action.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
