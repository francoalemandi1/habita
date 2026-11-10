import { cn } from "@/lib/utils";
import { bankColors } from "@/lib/design-tokens";

export interface BankChipProps {
  bankSlug: string;
  label: string;
  className?: string;
}

/** Bank/wallet name on its brand color (bankColors); unknown brands get a neutral token chip. */
export function BankChip({ bankSlug, label, className }: BankChipProps): React.JSX.Element {
  const brand = bankColors[bankSlug];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[6px] px-2 py-1 text-xs font-bold",
        !brand && "bg-sand text-ink",
        className,
      )}
      style={brand ? { backgroundColor: brand.bg, color: brand.text } : undefined}
    >
      {label}
    </span>
  );
}
