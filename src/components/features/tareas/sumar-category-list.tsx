import { Check, Plus } from "lucide-react";
import { FilterChip } from "@/components/ds/chip";

import type { SumarCategory, SumarTaskItem } from "@/lib/tareas-sumar";

interface SumarCategoryListProps {
  categories: readonly SumarCategory[];
  activeCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  selected: ReadonlyMap<string, SumarTaskItem>;
  existingNames: ReadonlySet<string>;
  onToggleTask: (task: SumarTaskItem) => void;
}

/** Ambient category chips + grouped, togglable tasks (handoff §5.2 "Sumar"). */
export function SumarCategoryList({
  categories,
  activeCategory,
  onSelectCategory,
  selected,
  existingNames,
  onToggleTask,
}: SumarCategoryListProps): React.JSX.Element {
  const visibleCategories = activeCategory ? categories.filter((c) => c.name === activeCategory) : categories;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <FilterChip active={activeCategory === null} onClick={() => onSelectCategory(null)}>
          Todas
        </FilterChip>
        {categories.map((category) => (
          <FilterChip key={category.name} active={activeCategory === category.name} onClick={() => onSelectCategory(category.name)}>
            {category.icon} {category.label}
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {visibleCategories.map((category) => (
          <div key={category.name} className="rounded-[16px] bg-surface p-3">
            <p className="mb-2 px-1 text-[13px] font-semibold text-ink-2">
              {category.icon} {category.label}
            </p>
            <div className="flex flex-col gap-1">
              {category.tasks.map((task) => {
                const isExisting = existingNames.has(task.name.toLowerCase());
                const isSelected = selected.has(task.name);
                return (
                  <button
                    key={task.name}
                    type="button"
                    disabled={isExisting}
                    onClick={() => onToggleTask(task)}
                    className="flex items-center gap-3 rounded-[12px] px-2 py-2 text-left disabled:opacity-40"
                  >
                    <span
                      className={
                        isSelected || isExisting
                          ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-monte text-paper"
                          : "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line text-ink-3"
                      }
                    >
                      {isSelected || isExisting ? <Check className="size-3.5" strokeWidth={2.5} /> : <Plus className="size-3.5" strokeWidth={2} />}
                    </span>
                    <span className="text-[14px] text-ink">{task.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
