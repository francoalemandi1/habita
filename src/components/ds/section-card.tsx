import { useId } from "react";
import { cn } from "@/lib/utils";

export interface SectionCardProps {
  title: string;
  /** Optional trailing control in the header (button, link). */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Titled content card (§9.2: radius 20, no border or shadow, padding 20 / 16 on mobile). */
export function SectionCard({ title, action, children, className }: SectionCardProps): React.JSX.Element {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className={cn("flex flex-col gap-1 rounded-[20px] bg-surface px-4 py-4 md:px-5", className)}>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 id={titleId} className="text-[17px] font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
