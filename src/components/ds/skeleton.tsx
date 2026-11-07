"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { shouldShowSkeleton } from "./lib/skeleton-logic";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("rounded-[6px] bg-sand", className)} {...props} />;
}

export interface SkeletonBoundaryProps {
  /** True while the real data is still loading. */
  loading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}

/**
 * §6.20 — static skeleton, hidden if data arrives under 300ms, content
 * fades in over 180ms once it does appear.
 */
export function SkeletonBoundary({ loading, skeleton, children }: SkeletonBoundaryProps): React.JSX.Element {
  const [showSkeleton, setShowSkeleton] = React.useState(false);
  const startedAtRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!loading) {
      setShowSkeleton(false);
      startedAtRef.current = null;
      return;
    }

    startedAtRef.current = Date.now();
    const timer = setTimeout(() => {
      const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
      if (shouldShowSkeleton(elapsed)) {
        setShowSkeleton(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return showSkeleton ? <>{skeleton}</> : <></>;
  }

  return <div className="animate-[fade-in_180ms_ease-out]">{children}</div>;
}
