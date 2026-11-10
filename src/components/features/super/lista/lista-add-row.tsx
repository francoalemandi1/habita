"use client";

import { useState } from "react";
import { ListPlus } from "lucide-react";

interface ListaAddRowProps {
  onAdd: (name: string) => void;
  onOpenCatalog: () => void;
}

/** "Agregar producto…" — Enter adds (optimistic, so the field never locks between items); the icon opens the catalog. */
export function ListaAddRow({ onAdd, onOpenCatalog }: ListaAddRowProps): React.JSX.Element {
  const [value, setValue] = useState("");

  function submit(): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  }

  return (
    <div className="flex gap-2 pb-1 pt-2">
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
        }}
        placeholder="Agregar producto…"
        maxLength={100}
        enterKeyHint="done"
        autoComplete="off"
        aria-label="Agregar producto"
        className="h-11 min-w-0 flex-1 rounded-[12px] border-[1.5px] border-transparent bg-paper px-3.5 text-[15px] text-ink outline-none transition-colors duration-180 placeholder:text-ink-2 focus:border-monte"
      />
      <button
        type="button"
        onClick={onOpenCatalog}
        aria-label="Abrir catálogo de productos"
        title="Catálogo de productos"
        className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-paper text-ink-2 outline-none transition-colors hover:bg-sand hover:text-ink focus-visible:ring-2 focus-visible:ring-monte"
      >
        <ListPlus className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
