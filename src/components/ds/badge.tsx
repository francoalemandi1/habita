import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "monte" | "ladrillo" | "manteca" | "sand";
}

const TONE_CLASSES: Record<NonNullable<BadgeProps["tone"]>, string> = {
  monte: "bg-monte-soft text-monte",
  ladrillo: "bg-ladrillo-soft text-ladrillo-text",
  manteca: "bg-manteca-soft text-manteca-text",
  sand: "bg-sand text-ink-2",
};

export function Badge({
  tone = "sand",
  className,
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-medium",
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    />
  );
}
