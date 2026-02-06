"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Lightbulb, ChevronRight, AlertCircle } from "lucide-react";

interface Recommendation {
  taskName: string;
  suggestedMember: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

interface AiRecommendations {
  recommendations: Recommendation[];
  insights: string[];
}

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const PRIORITY_LABELS = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export function AiSuggestionsCard() {
  const [data, setData] = useState<AiRecommendations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/recommendations");

      if (response.status === 503) {
        // AI not configured - silently hide the card
        setError("not_configured");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch recommendations");
      }

      const result = await response.json() as AiRecommendations;
      setData(result);
    } catch (err) {
      console.error("Error fetching AI recommendations:", err);
      setError("fetch_error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  // Don't render if AI is not configured
  if (error === "not_configured") {
    return null;
  }

  // Show minimal card on error
  if (error === "fetch_error") {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No se pudieron cargar las sugerencias</span>
            <Button variant="ghost" size="sm" onClick={fetchRecommendations}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Sugerencias IA</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchRecommendations}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && !data ? (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Analizando tu hogar...
            </span>
          </div>
        ) : data ? (
          <>
            {/* Insights */}
            {data.insights.length > 0 && (
              <div className="rounded-2xl bg-muted/50 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs font-medium">Observaciones</span>
                </div>
                <ul className="space-y-1">
                  {data.insights.slice(0, 2).map((insight, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Recomendaciones de asignación
                </p>
                {data.recommendations
                  .slice(0, isExpanded ? undefined : 3)
                  .map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-2 rounded-2xl border bg-card p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{rec.taskName}</p>
                        <p className="text-xs text-muted-foreground">
                          Sugerido: <span className="font-medium">{rec.suggestedMember}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground/80">
                          {rec.reason}
                        </p>
                      </div>
                      <Badge className={PRIORITY_COLORS[rec.priority]} variant="secondary">
                        {PRIORITY_LABELS[rec.priority]}
                      </Badge>
                    </div>
                  ))}

                {data.recommendations.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? "Ver menos" : `Ver ${data.recommendations.length - 3} más`}
                    <ChevronRight
                      className={`ml-1 h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No hay sugerencias disponibles
          </p>
        )}
      </CardContent>
    </Card>
  );
}
