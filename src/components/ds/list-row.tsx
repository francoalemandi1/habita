import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
  /** Navigates on press and shows a trailing chevron; the row itself is the link, so dividers stay intact. */
  href?: string;
  /** `danger` marks an irreversible account action (e.g. leaving the household); it should open a confirm dialog. */
  tone?: ListRowTone;
  className?: string;
}

export type ListRowTone = "default" | "danger";

const TONE_STYLES: Record<ListRowTone, { iconBox: string; icon: string; title: string }> = {
  default: { iconBox: "bg-paper", icon: "text-ink", title: "text-ink" },
  danger: { iconBox: "bg-ladrillo-soft", icon: "text-ladrillo-text", title: "text-ladrillo-text" },
};

/** §6.11 — 60px min height, lineSoft divider, 36px leading icon square. */
export function ListRow({
  leadingIcon: Icon,
  leadingAvatar,
  title,
  meta,
  trailingAmount,
  trailing,
  onClick,
  href,
  tone = "default",
  className,
}: ListRowProps): React.JSX.Element {
  const toneStyles = TONE_STYLES[tone];
  const rowClassName = cn(
    "flex min-h-[60px] w-full items-center gap-3 border-b border-line-soft px-1 py-2 text-left last:border-b-0",
    (onClick || href) && "outline-none transition-colors duration-100 hover:bg-paper/60 focus-visible:ring-2 focus-visible:ring-monte",
    className
  );
  const content = (
    <>
      {Icon && (
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px]", toneStyles.iconBox)}>
          <Icon className={cn("size-[18px]", toneStyles.icon)} strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
      {leadingAvatar}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-[15px] font-medium", toneStyles.title)}>{title}</span>
        {meta && <span className="truncate text-[13px] text-ink-2">{meta}</span>}
      </span>
      {trailingAmount && (
        <span className="shrink-0 text-[15px] font-medium text-ink">{trailingAmount}</span>
      )}
      {trailing}
      {href && <ChevronRight className="size-4 shrink-0 text-ink-3" strokeWidth={1.75} aria-hidden="true" />}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={rowClassName}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClassName}>
        {content}
      </button>
    );
  }
  return <div className={rowClassName}>{content}</div>;
}
