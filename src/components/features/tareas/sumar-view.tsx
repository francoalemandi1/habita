"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import { useSnackbar } from "@/components/ds/snackbar";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@habita/contracts";
import { useTareasTaskMutations, useTareasTasks } from "@/hooks/use-tareas-tasks";
import { mapCatalogToSumarCategories, mapSuggestionsToSumarCategories, sumarLabel } from "@/lib/tareas-sumar";
import { CreateTaskDialog } from "./create-task-dialog";
import { SumarCategoryList } from "./sumar-category-list";

import type { CatalogCategoryLite, SumarCategory, SumarTaskItem } from "@/lib/tareas-sumar";
import type { SuggestTasksResponse } from "@habita/contracts";

interface CatalogResponse {
  categories: CatalogCategoryLite[];
}

/** Sumar — catalog + AI suggestions, batch add (handoff §5.2 `/tareas/sumar`, replaces /suggest-tasks + /task-catalog). */
export function SumarView(): React.JSX.Element {
  const { data: catalogData } = useQuery({
    queryKey: queryKeys.tasks.catalog(),
    queryFn: () => apiFetch<CatalogResponse>("/api/tasks/catalog"),
  });
  const { data: existingTasks } = useTareasTasks();
  const taskMutations = useTareasTaskMutations();
  const snackbar = useSnackbar();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, SumarTaskItem>>(new Map());
  const [suggestions, setSuggestions] = useState<SumarCategory[] | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const existingNames = useMemo(
    () => new Set((existingTasks?.tasks ?? []).map((t) => t.name.toLowerCase())),
    [existingTasks],
  );
  const categories = useMemo(
    () => [...mapCatalogToSumarCategories(catalogData?.categories ?? []), ...(suggestions ?? [])],
    [catalogData, suggestions],
  );

  function toggleTask(task: SumarTaskItem): void {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(task.name)) next.delete(task.name);
      else next.set(task.name, task);
      return next;
    });
  }

  async function handleSuggest(): Promise<void> {
    setIsSuggesting(true);
    try {
      const result = await apiFetch<SuggestTasksResponse>("/api/ai/suggest-tasks", { method: "POST", body: {} });
      setSuggestions(mapSuggestionsToSumarCategories(result.categories));
    } catch (error) {
      console.warn("No se pudieron generar sugerencias", error);
      snackbar.show({ text: "No pudimos sugerir tareas ahora, probá el catálogo", tone: "error" });
    } finally {
      setIsSuggesting(false);
    }
  }

  async function handleAddSelected(): Promise<void> {
    setIsAdding(true);
    const tasks = Array.from(selected.values());
    const results = await Promise.allSettled(
      tasks.map((task) =>
        taskMutations.create.mutateAsync({
          name: task.name,
          frequency: task.frequency,
          weight: task.weight,
          estimatedMinutes: task.estimatedMinutes,
        }),
      ),
    );
    const added = results.filter((r) => r.status === "fulfilled").length;
    setIsAdding(false);
    setSelected(new Map());
    snackbar.show({ text: added > 0 ? `${added} tareas sumadas` : "No se pudo sumar ninguna tarea" });
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-ink">Sumar tareas</h1>
        <button type="button" onClick={() => setCreateOpen(true)} className="text-[14px] font-medium text-monte">
          Crear una tarea propia
        </button>
      </div>

      <button
        type="button"
        onClick={handleSuggest}
        disabled={isSuggesting}
        className="flex items-center justify-center gap-2 rounded-[14px] bg-manteca-soft px-4 py-3 text-[14px] font-semibold text-ink"
      >
        {isSuggesting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" strokeWidth={1.75} />}
        Sugerirnos tareas con IA
      </button>

      <SumarCategoryList
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        selected={selected}
        existingNames={existingNames}
        onToggleTask={toggleTask}
      />

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface px-4 py-3">
          <div className="container mx-auto max-w-4xl">
            <button
              type="button"
              disabled={isAdding}
              onClick={handleAddSelected}
              className="h-11 w-full rounded-[12px] bg-monte text-[15px] font-semibold text-paper disabled:bg-line"
            >
              {sumarLabel(selected.size, isAdding)}
            </button>
          </div>
        </div>
      )}

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={taskMutations.create.isPending}
        onSubmit={(values) => taskMutations.create.mutate(values, { onSuccess: () => setCreateOpen(false) })}
      />
    </div>
  );
}
