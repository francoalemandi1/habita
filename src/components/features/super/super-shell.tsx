import { cn } from "@/lib/utils";

import type { SuperViewKey } from "@/components/features/super/super-segments";

interface SuperShellProps {
  view: SuperViewKey;
  lista: React.ReactNode;
  comparar: React.ReactNode;
  ofertas: React.ReactNode;
}

/**
 * Web responsive split (handoff §5.3 "Web layout"): below `lg` each segment
 * is its own full-width screen; from `lg` up, Lista and Comparar render side
 * by side (segments still deep-link/scroll, Ofertas stays full width always).
 * CSS-only (no matchMedia) so there is no hydration flicker.
 */
export function SuperShell({ view, lista, comparar, ofertas }: SuperShellProps): React.JSX.Element {
  const showSplit = view !== "ofertas";

  return (
    <div className={cn(showSplit && "lg:grid lg:grid-cols-[420px_1fr] lg:items-start lg:gap-6")}>
      <div className={cn(view === "lista" ? "block" : "hidden", showSplit && "lg:block")}>{lista}</div>
      <div className={cn(view === "comparar" ? "block" : "hidden", showSplit && "lg:block")}>{comparar}</div>
      <div className={cn(view === "ofertas" ? "block" : "hidden")}>{ofertas}</div>
    </div>
  );
}
