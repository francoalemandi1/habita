"use client";

import type { ReactNode } from "react";

interface FeatureHighlightProps {
  active: boolean;
  children: ReactNode;
  label?: string;
}

export function FeatureHighlight({ active, children, label = "Nuevo" }: FeatureHighlightProps) {
  if (!active) return <>{children}</>;

  return (
    <div className="relative">
      <div className="animate-pulse-ring rounded-2xl">
        {children}
      </div>
      <span className="absolute -right-1 -top-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
        {label}
      </span>
    </div>
  );
}
