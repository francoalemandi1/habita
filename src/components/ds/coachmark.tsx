"use client";

import { cn } from "@/lib/utils";

export interface CoachmarkProps {
  text: string;
  /** Side the arrow points toward the anchor element. */
  arrowSide?: "top" | "bottom";
  onDismiss: () => void;
  className?: string;
}

/**
 * §6.23 — replaces TourSheet/OnboardingChecklist/FeatureHighlight; caller is
 * responsible for showing it only once per tip (persisted dismissal state).
 */
export function Coachmark({ text, arrowSide = "top", onDismiss, className }: CoachmarkProps): React.JSX.Element {
  return (
    <div className={cn("relative inline-flex max-w-xs items-start gap-2 rounded-[14px] bg-ink px-3.5 py-3", className)}>
      <span
        className={cn(
          "absolute left-5 size-3 rotate-45 bg-ink",
          arrowSide === "top" ? "-top-1.5" : "-bottom-1.5"
        )}
        aria-hidden="true"
      />
      <p className="text-[13px] text-paper">{text}</p>
      <button type="button" onClick={onDismiss} className="shrink-0 text-[13px] font-semibold text-manteca">
        Listo
      </button>
    </div>
  );
}
