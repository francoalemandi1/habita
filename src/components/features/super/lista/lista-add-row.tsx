"use client";

import { useState } from "react";
import { ListPlus } from "lucide-react";

interface ListaAddRowProps {
  onAdd: (name: string) => void;
  onOpenCatalog: () => void;
  disabled?: boolean;
}

/** "Agregar producto…" — Enter adds; the catalog icon opens the full picker. */
export function ListaAddRow({ onAdd, onOpenCatalog, disabled }: ListaAddRowProps): React.JSX.Element {
  const [value, setValue] = useState("");

  function submit(): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  }

  return (
    <div className="flex gap-2 py-2">
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
        }}
        placeholder="Agregar producto…"
        maxLength={100}
        disabled={disabled}
        aria-label="Agregar producto"
        className="h-11 min-w-0 flex-1 rounded-[12px] border border-line bg-paper px-3.5 text-[15px] text-ink outline-none transition-colors duration-180 placeholder:text-ink-3 focus:border-[1.5px] focus:border-monte focus:bg-surface disabled:opacity-50"
      />
      <button
        type="button"
        onClick={onOpenCatalog}
        disabled={disabled}
        aria-label="Abrir catálogo de productos"
        className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-line bg-paper text-ink-2 transition-colors hover:text-ink disabled:opacity-50"
      >
        <ListPlus className="size-[18px]" strokeWidth={1.75} />
      </button>
    </div>
  );
}
