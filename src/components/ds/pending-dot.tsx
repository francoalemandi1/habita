import { cn } from "@/lib/utils";

export interface PendingDotProps {
  className?: string;
}

/** §7 "Sin conexión" — ink3 dot marking an A/B row with a mutation queued until it syncs. */
export function PendingDot({ className }: PendingDotProps): React.JSX.Element {
  return (
    <span
      role="status"
      aria-label="Pendiente de enviar"
      className={cn("inline-block size-1.5 shrink-0 rounded-full bg-ink-3", className)}
    />
  );
}
