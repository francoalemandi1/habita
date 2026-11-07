"use client";

import * as React from "react";
import { Mic, Send } from "lucide-react";
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
  className?: string;
}

/** §6.22 — free-text input, trailing mic/send button, interpreted chips below. */
export function Composer({ value, onChange, onSubmit, placeholder = "Anotá un gasto, tarea o ítem…", chips, className }: ComposerProps): React.JSX.Element {
  const hasText = value.trim().length > 0;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && hasText) {
      onSubmit();
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-1.5 rounded-[14px] bg-paper p-1.5 pl-4 focus-within:bg-surface focus-within:border focus-within:border-monte">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-10 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
        />
        <button
          type="button"
          onClick={hasText ? onSubmit : undefined}
          aria-label={hasText ? "Enviar" : "Grabar audio"}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[12px]",
            hasText ? "bg-monte text-paper" : "text-ink-2"
          )}
        >
          {hasText ? <Send className="size-4" strokeWidth={1.75} /> : <Mic className="size-4" strokeWidth={1.75} />}
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
