import { Info, Tag, AlertTriangle, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type BannerTone = "info" | "offer" | "attention" | "offline";

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  tone: BannerTone;
  children: React.ReactNode;
}

const TONE_CONFIG: Record<BannerTone, { className: string; Icon: typeof Info }> = {
  info: { className: "bg-surface text-ink border border-line", Icon: Info },
  offer: { className: "bg-manteca-soft text-manteca-text", Icon: Tag },
  attention: { className: "bg-ladrillo-soft text-ladrillo-text", Icon: AlertTriangle },
  offline: { className: "bg-sand text-ink-2", Icon: WifiOff },
};

/** §6.18 — one per screen, closes on its own when the cause disappears (no manual close). */
export function Banner({ tone, children, className, ...props }: BannerProps): React.JSX.Element {
  const { className: toneClassName, Icon } = TONE_CONFIG[tone];
  return (
    <div
      role="status"
      className={cn("flex items-start gap-2.5 rounded-[12px] px-3.5 py-3 text-[14px]", toneClassName, className)}
      {...props}
    >
      <Icon className="size-4 shrink-0 mt-0.5" strokeWidth={1.75} />
      <div>{children}</div>
    </div>
  );
}
