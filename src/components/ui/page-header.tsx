"use client";

import { BackButton } from "@/components/ui/back-button";
import { cn } from "@/lib/utils";
import { typography, spacing, iconSize } from "@/lib/design-tokens";

import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  backButton?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  backButton,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(spacing.pageHeader, className)}>
      {backButton && <BackButton />}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className={cn(typography.pageTitle, "flex items-center gap-2")}>
            {Icon && (
              <Icon className={cn(iconSize.lg, "shrink-0 text-primary")} />
            )}
            <span className="truncate">{title}</span>
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
