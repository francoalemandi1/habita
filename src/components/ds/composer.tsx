"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComposerChip {
  id: string;
  label: string;
  /** The type chip ("Gasto" / "Tarea" / "Compra") renders Salvia/Monte first. */
  isType?: boolean;
}

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  chips?: ComposerChip[];
  /** Focus the field on mount, e.g. when the composer is the reason a sheet opened. */
  autoFocus?: boolean;
  className?: string;
}

/** §6.22 — free-text input, trailing mic/send button, interpreted chips below. */
export function Composer({ value, onChange, onSubmit, placeholder = "Anotá un gasto, tarea o ítem…", chips, autoFocus, className }: ComposerProps): React.JSX.Element {
  const hasText = value.trim().length > 0;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && hasText) {
      onSubmit();
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-1.5 rounded-[14px] bg-surface p-1.5 pl-4 ring-monte transition-shadow duration-100 focus-within:ring-[1.5px]">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Qué querés anotar"
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="send"
          className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!hasText}
          aria-label="Interpretar"
          className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-monte text-paper outline-none transition-opacity duration-100 focus-visible:ring-2 focus-visible:ring-monte focus-visible:ring-offset-2 disabled:bg-sand disabled:text-ink-3"
        >
          <Send className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className={cn(
                "rounded-full px-3 py-1 text-[13px] font-medium",
                chip.isType ? "bg-monte-soft text-monte" : "bg-sand text-ink-2"
              )}
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
