import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** §6.21 — title, one explanation line, a single primary action. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-16 text-center", className)}>
      {Icon && <Icon className="size-10 text-ink-3" strokeWidth={1.75} />}
      <p className="text-[28px] font-bold leading-tight text-ink">{title}</p>
      {description && <p className="max-w-sm text-[15px] text-ink-2">{description}</p>}
      {action}
    </div>
  );
}
