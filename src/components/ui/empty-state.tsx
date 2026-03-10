import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  /** Use a custom ReactNode as icon (e.g. HabitaLogo) */
  customIcon?: React.ReactNode;
  /** Use emoji instead of a Lucide icon */
  emoji?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  customIcon,
  emoji,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl bg-muted/30 px-6 py-16 text-center",
        className,
      )}
    >
      {Icon && <Icon className="h-10 w-10 text-muted-foreground/50" />}
      {customIcon}
      {emoji && <span className="text-5xl">{emoji}</span>}
      <p className="text-lg font-semibold">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
}
