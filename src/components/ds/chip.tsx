import { cn } from "@/lib/utils";

export type ChipStatus = "al-dia" | "vence-hoy" | "descuento" | "esperando";

export interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** §6.8 filter variant — toggleable, used for category/day filters. */
export function FilterChip({
  active = false,
  className,
  ...props
}: FilterChipProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-[30px] items-center rounded-full px-3 text-[13px] font-medium transition-colors duration-180",
        active ? "bg-ink text-paper" : "bg-surface text-ink border border-line",
        className
      )}
      {...props}
    />
  );
}

export interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: ChipStatus;
}

const STATUS_CLASSES: Record<ChipStatus, string> = {
  "al-dia": "bg-monte-soft text-monte",
  "vence-hoy": "bg-ladrillo-soft text-ladrillo-text",
  descuento: "bg-manteca-soft text-manteca-text",
  esperando: "bg-sand text-ink-2",
};

const STATUS_LABELS: Record<ChipStatus, string> = {
  "al-dia": "Al día",
  "vence-hoy": "Vence hoy",
  descuento: "Descuento",
  esperando: "Esperando",
};

/** §6.8 status variant — read-only, semantic tone per state. */
export function StatusChip({
  status,
  className,
  children,
  ...props
}: StatusChipProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium",
        STATUS_CLASSES[status],
        className
      )}
      {...props}
    >
      {children ?? STATUS_LABELS[status]}
    </span>
  );
}
