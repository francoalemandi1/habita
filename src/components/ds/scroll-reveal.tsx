"use client";

import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

import type { ReactNode } from "react";

/** Reveal-on-scroll wrapper; `prefers-reduced-motion` is handled globally in globals.css. */
export function ScrollReveal({ children, className }: { children: ReactNode; className?: string }): React.JSX.Element {
  const { elementRef, isVisible } = useIntersectionObserver();

  return (
    <div
      ref={elementRef}
      className={`${isVisible ? "animate-reveal-up" : "opacity-0"} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
