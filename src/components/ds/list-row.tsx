import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

export interface ListRowProps {
  leadingIcon?: LucideIcon;
  leadingAvatar?: React.ReactNode;
  title: string;
  meta?: string;
  trailingAmount?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/** §6.11 — 60px min height, lineSoft divider, 36px leading icon square. */
export function ListRow({
  leadingIcon: Icon,
  leadingAvatar,
  title,
  meta,
  trailingAmount,
  trailing,
  onClick,
  className,
}: ListRowProps): React.JSX.Element {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex min-h-[60px] w-full items-center gap-3 border-b border-line-soft px-1 py-2 text-left last:border-b-0",
        className
      )}
    >
      {Icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-paper">
          <Icon className="size-[18px] text-ink" strokeWidth={1.75} />
        </span>
      )}
      {leadingAvatar}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium text-ink">{title}</span>
        {meta && <span className="truncate text-[13px] text-ink-2">{meta}</span>}
      </span>
      {trailingAmount && (
        <span className="shrink-0 text-[15px] font-medium tabular-nums text-ink">{trailingAmount}</span>
      )}
      {trailing}
    </Tag>
  );
}
