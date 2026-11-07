import { cn } from "@/lib/utils";
import { computeSplitBarSegments } from "./lib/split-bar-logic";

export interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  className?: string;
}

/** §6.19 — 8px track, radius 4, always paired with a text explaining what's left. */
export function ProgressBar({ value, max, label, className }: ProgressBarProps): React.JSX.Element {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-line-soft"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="h-full rounded-full bg-monte transition-[width] duration-[420ms] ease-[cubic-bezier(.3,0,0,1)]"
          style={{ width: `${percent}%` }}
        />
      </div>
      {label && <p className="text-[13px] text-ink-2">{label}</p>}
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
