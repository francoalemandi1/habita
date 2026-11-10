import { flushSync } from "react-dom";

/**
 * Runs a synchronous state update inside a same-document View Transition so elements
 * with a `view-transition-name` animate to their new position. Falls back to a plain
 * update when unsupported or when the user prefers reduced motion.
 */
export function withViewTransition(update: () => void): void {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || typeof document.startViewTransition !== "function") {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}
