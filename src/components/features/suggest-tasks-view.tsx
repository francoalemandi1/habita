"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Clock, Loader2, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { FREQUENCY_LABELS } from "@/lib/constants";
import { spacing, typography, iconSize } from "@/lib/design-tokens";

import type { SuggestTasksInput, SuggestTasksResponse, TaskCategoryGroup, SuggestedTask } from "@habita/contracts";

const FREQ_LABELS: Record<SuggestedTask["frequency"], string> = FREQUENCY_LABELS;

function CategorySection({ category }: { category: TaskCategoryGroup }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border bg-card">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{category.icon}</span>
          <span className="font-semibold">{category.label}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {category.tasks.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="space-y-2 px-4 pb-4">
          {category.tasks.map((task, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
              <span className="mt-0.5 text-lg">{task.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{task.name}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{FREQ_LABELS[task.frequency] ?? task.frequency}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ~{task.estimatedMinutes} min
                  </span>
                  <span>Peso {task.weight}</span>
                </div>
                {task.reason && (
                  <p className="mt-1 text-xs text-violet-600 dark:text-violet-400">
                    ✨ {task.reason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SuggestTasksView() {
  const [hasChildren, setHasChildren] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SuggestTasksResponse | null>(null);

  const handleGenerate = async () => {
    setIsPending(true);
    setError(null);
    try {
      const input: SuggestTasksInput = {
        hasChildren,
        hasPets,
        location: location.trim() || undefined,
        householdDescription: description.trim() || undefined,
      };
      const result = await apiFetch<SuggestTasksResponse>("/api/ai/suggest-tasks", {
        method: "POST",
        body: input,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar sugerencias");
    } finally {
      setIsPending(false);
    }
  };

  const categories = data?.categories ?? [];
  const insights = data?.insights ?? [];
  const totalTasks = categories.reduce((sum, c) => sum + c.tasks.length, 0);

  return (
    <>
      <div className={spacing.pageHeader}>
        <h1 className={cn(typography.pageTitle, "flex items-center gap-2")}>
          <Sparkles className={`${iconSize.lg} text-primary shrink-0`} />
          Sugerencias de Tareas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contanos sobre tu hogar y te sugerimos el catálogo ideal.
        </p>
      </div>

      {/* Form */}
      <div className="mb-4 space-y-4 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">👶</span>
            <span className="text-sm">Hay niños en el hogar</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hasChildren}
            onClick={() => setHasChildren((v) => !v)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              hasChildren ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                hasChildren ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🐾</span>
            <span className="text-sm">Hay mascotas</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hasPets}
            onClick={() => setHasPets((v) => !v)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              hasPets ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                hasPets ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <div>
          <label htmlFor="location" className="mb-1 block text-xs font-medium text-muted-foreground">
            Ciudad / zona (opcional)
          </label>
          <input
            id="location"
            type="text"
            placeholder="ej: Buenos Aires, Palermo"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="description" className="mb-1 block text-xs font-medium text-muted-foreground">
            Descripción del hogar (opcional)
          </label>
          <textarea
            id="description"
            placeholder="ej: Apartamento de 3 ambientes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isPending}
        className={cn(
          "mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity",
          isPending && "opacity-60"
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generando sugerencias...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Sugerir tareas
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-4 rounded-xl border-l-4 border-violet-500 bg-violet-50 p-4 dark:bg-violet-950/30">
          {insights.map((insight, i) => (
            <p key={i} className="text-sm text-violet-700 dark:text-violet-300">
              <Lightbulb className="mr-1.5 inline-block h-3.5 w-3.5" />
              {insight}
            </p>
          ))}
        </div>
      )}

      {/* Results */}
      {categories.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-semibold">
            {totalTasks} tareas sugeridas en {categories.length} categorías
          </p>
          <div className="space-y-3">
            {categories.map((cat) => (
              <CategorySection key={cat.name} category={cat} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isPending && !data && !error && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 px-6 py-16 text-center">
          <span className="text-5xl">🏠</span>
          <p className="text-lg font-semibold">Tu catálogo personalizado</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Configurá tu hogar y generamos un catálogo de tareas personalizado.
          </p>
        </div>
      )}
    </>
  );
}
