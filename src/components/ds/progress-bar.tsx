import { cn } from "@/lib/utils";
import { computeSplitBarSegments } from "./lib/split-bar-logic";

export interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  /** "onMonte" for bars drawn on a Monte surface (Fondo hero): Manteca fill on a translucent Papel track. */
  tone?: "default" | "onMonte";
  className?: string;
}

const PROGRESS_TONES = {
  default: { track: "bg-line-soft", fill: "bg-monte", label: "text-ink-2" },
  onMonte: { track: "bg-paper/20", fill: "bg-manteca", label: "text-paper/80" },
} as const;

/** §6.19 — 8px track, radius 4, always paired with a text explaining what's left. */
export function ProgressBar({ value, max, label, tone = "default", className }: ProgressBarProps): React.JSX.Element {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const colors = PROGRESS_TONES[tone];
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        className={cn("h-2 w-full overflow-hidden rounded-full", colors.track)}
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-[420ms] ease-[cubic-bezier(.3,0,0,1)]", colors.fill)}
          style={{ width: `${percent}%` }}
        />
      </div>
      {label && <p className={cn("text-[13px]", colors.label)}>{label}</p>}
    </div>
  );
}

export interface SplitBarSegmentInput {
  id: string;
  value: number;
  colorClassName: string;
}

export interface SplitBarProps {
  segments: SplitBarSegmentInput[];
  total: number;
  label?: string;
  className?: string;
}

/** §6.19 — multi-person split, 3px gap between segments, same width rule as ProgressBar. */
export function SplitBar({ segments, total, label, className }: SplitBarProps): React.JSX.Element {
  const computed = computeSplitBarSegments(segments, total);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex h-2 w-full gap-[3px]" role="img" aria-label={label}>
        {computed.map((segment, index) => {
          const colorClassName = segments[index]?.colorClassName ?? "bg-line";
          return (
            <div
              key={segment.id}
              className={cn("h-full rounded-full transition-[width] duration-[420ms]", colorClassName)}
              style={{ width: `${segment.percent}%` }}
            />
          );
        })}
      </div>
      {label && <p className="text-[13px] text-ink-2">{label}</p>}
    </div>
  );
}
