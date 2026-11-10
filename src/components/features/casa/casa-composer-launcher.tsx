"use client";

import { openAnotar } from "@/components/features/anotar/anotar-events";

/** Casa web (Design System §09): the Composer sits top-right; clicking it (or pressing N) opens Anotar. */
export function CasaComposerLauncher(): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => openAnotar()}
      className="flex h-12 w-[420px] max-w-full items-center justify-between gap-3 rounded-[14px] bg-surface pl-4 pr-3 text-left text-[15px] text-ink-2 transition-colors duration-100 hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-monte"
    >
      <span className="truncate">Anotá un gasto, una tarea o algo para comprar…</span>
      <kbd aria-hidden="true" className="shrink-0 rounded-[6px] bg-paper px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-2">
        N
      </kbd>
    </button>
  );
}
