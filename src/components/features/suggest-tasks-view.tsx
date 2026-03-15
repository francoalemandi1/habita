"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Clock, Loader2, Lightbulb, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { FREQUENCY_LABELS } from "@/lib/constants";
import { EmptyState } from "@/components/ui/empty-state";
import { HabitaLogo } from "@/components/ui/habita-logo";
import { PageHeader } from "@/components/ui/page-header";

import type { SuggestTasksInput, SuggestTasksResponse, TaskCategoryGroup, SuggestedTask } from "@habita/contracts";

const FREQ_LABELS: Record<SuggestedTask["frequency"], string> = FREQUENCY_LABELS;

const taskKey = (catName: string, taskName: string) => `${catName}::${taskName}`;

function CategorySection({
  category,
  selectedKeys,
  onToggle,
}: {
  category: TaskCategoryGroup;
  selectedKeys: Set<string>;
  onToggle: (catName: string, taskName: string) => void;
}) {
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
          {category.tasks.map((task, i) => {
            const key = taskKey(category.name, task.name);
            const selected = selectedKeys.has(key);
            return (
              <button
                key={i}
                type="button"
                onClick={() => onToggle(category.name, task.name)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors",
                  selected
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "bg-muted/50 hover:bg-muted"
                )}
              >
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
                <div
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
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
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [addLoading, setAddLoading] = useState(false);
  const [addResult, setAddResult] = useState<{ added: number; errors: number } | null>(null);

  const handleGenerate = async () => {
    setIsPending(true);
    setError(null);
    setSelectedKeys(new Set());
    setAddResult(null);
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

  const toggleTask = (catName: string, taskName: string) => {
    const key = taskKey(catName, taskName);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (!data) return;
    setAddLoading(true);
    setAddResult(null);

    const toAdd = data.categories.flatMap((cat) =>
      cat.tasks
        .filter((t) => selectedKeys.has(taskKey(cat.name, t.name)))
        .map((t) => ({
          name: t.name,
          frequency: t.frequency,
          weight: t.weight,
          estimatedMinutes: t.estimatedMinutes,
        }))
    );

    const results = await Promise.allSettled(
      toAdd.map((task) =>
        apiFetch("/api/tasks", { method: "POST", body: task })
      )
    );

    const added = results.filter((r) => r.status === "fulfilled").length;
    const errors = results.filter((r) => r.status === "rejected").length;
    setAddResult({ added, errors });
    if (added > 0) setSelectedKeys(new Set());
    setAddLoading(false);
  };

  const categories = data?.categories ?? [];
  const insights = data?.insights ?? [];
  const totalTasks = categories.reduce((sum, c) => sum + c.tasks.length, 0);

  return (
    <>
      <PageHeader backButton icon={Sparkles} title="Sugerencias de Tareas" subtitle="Contanos sobre tu hogar y te sugerimos el catálogo ideal." />

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

      {/* Add result feedback */}
      {addResult && (
        <div className={cn(
          "mb-4 rounded-xl p-3 text-sm",
          addResult.errors > 0
            ? "border border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300"
            : "border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300"
        )}>
          {addResult.added > 0 && `✓ ${addResult.added} ${addResult.added === 1 ? "tarea agregada" : "tareas agregadas"} al listado. `}
          {addResult.errors > 0 && `${addResult.errors} no ${addResult.errors === 1 ? "pudo" : "pudieron"} agregarse (puede que ya existan).`}
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
        <div className="pb-24">
          <p className="mb-1 text-sm font-semibold">
            {totalTasks} tareas sugeridas en {categories.length} categorías
          </p>
          <p className="mb-3 text-xs text-muted-foreground">Tocá las que quieras agregar a tu listado</p>
          <div className="space-y-3">
            {categories.map((cat) => (
              <CategorySection
                key={cat.name}
                category={cat}
                selectedKeys={selectedKeys}
                onToggle={toggleTask}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isPending && !data && !error && (
        <EmptyState customIcon={<HabitaLogo size={48} className="rounded-xl" />} title="Tu catálogo personalizado" description="Configurá tu hogar y generamos un catálogo de tareas personalizado." />
      )}

      {/* Sticky add bar */}
      {selectedKeys.size > 0 && (
        <div className="fixed inset-x-0 bottom-22 z-10 border-t bg-background/95 backdrop-blur-sm md:bottom-0">
          <div className="container mx-auto max-w-4xl px-4 py-3 md:px-8">
            <button
              onClick={handleAddSelected}
              disabled={addLoading}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity",
                addLoading && "opacity-60"
              )}
            >
              {addLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Agregar {selectedKeys.size} {selectedKeys.size === 1 ? "tarea" : "tareas"} al listado
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
