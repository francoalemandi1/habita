import { cn } from "@/lib/utils";
import { storeColors } from "@/lib/design-tokens";

export interface StoreChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  store: string;
}

const FALLBACK_STORE_COLOR = { bg: "#5C665F", text: "#FFFFFF" } as const;

/** §6.9 — only used in Súper; third-party brand colors are kept, not themed. */
export function StoreChip({ store, className, style, ...props }: StoreChipProps): React.JSX.Element {
  const { bg, text } = storeColors[store] ?? FALLBACK_STORE_COLOR;
  return (
    <span
      className={cn("inline-flex items-center rounded-[6px] px-2 py-1 text-xs font-bold", className)}
      style={{ backgroundColor: bg, color: text, ...style }}
      {...props}
    >
      {store}
    </span>
  );
}
