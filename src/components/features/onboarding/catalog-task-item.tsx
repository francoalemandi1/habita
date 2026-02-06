"use client";

import { Check } from "lucide-react";

export interface CatalogTaskItemData {
  name: string;
  icon: string;
  defaultFrequency: string;
  defaultWeight?: number;
  estimatedMinutes?: number | null;
  minAge?: number | null;
  selected?: boolean;
}

interface CatalogTaskItemProps {
  task: CatalogTaskItemData;
  onToggle: () => void;
}

export function CatalogTaskItem({ task, onToggle }: CatalogTaskItemProps) {
  const isSelected = !!task.selected;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all ${
        isSelected
          ? "mb-1 bg-primary/10"
          : "bg-transparent hover:bg-muted/50"
      }`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-xl shadow-sm">
        {task.icon}
      </span>
      <span className="min-w-0 flex-1 text-base text-foreground">{task.name}</span>
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full transition-colors ${
          isSelected
            ? "bg-primary text-white"
            : "border-2 border-border"
        }`}
      >
        {isSelected && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}
