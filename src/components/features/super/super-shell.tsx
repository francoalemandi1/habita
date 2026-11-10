import { cn } from "@/lib/utils";

import type { SuperViewKey } from "@/components/features/super/super-view";

interface SuperShellProps {
  view: SuperViewKey;
  lista: React.ReactNode;
  comparar: React.ReactNode;
  ofertas: React.ReactNode;
}

/**
 * Web responsive split (handoff §5.3 "Web layout"): below `xl` each segment
 * is its own full-width screen; from `xl` up, Lista and Comparar render side
 * by side (Ofertas stays full width always). The split waits for `xl` because
 * at `lg` the results column is too narrow for a store cart. The list column is
 * sticky with its own scroll so it never leaves an empty gap beside long results.
 * CSS-only (no matchMedia) so there is no hydration flicker.
 */
export function SuperShell({ view, lista, comparar, ofertas }: SuperShellProps): React.JSX.Element {
  const showSplit = view !== "ofertas";

  return (
    <div className={cn(showSplit && "xl:grid xl:grid-cols-[minmax(340px,400px)_minmax(0,1fr)] xl:items-start xl:gap-6")}>
      <div
        className={cn(
          view === "lista" ? "block" : "hidden",
          showSplit && "xl:sticky xl:top-6 xl:block xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto xl:overscroll-contain",
        )}
      >
        {lista}
      </div>
      <div className={cn("min-w-0", view === "comparar" ? "block" : "hidden", showSplit && "xl:block")}>{comparar}</div>
      <div className={cn(view === "ofertas" ? "block" : "hidden")}>{ofertas}</div>
    </div>
  );
}
