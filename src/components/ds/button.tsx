"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

import type { VariantProps } from "class-variance-authority";

/**
 * §6.1 — `primary` is reserved for one CTA per screen and `destructive`
 * only ever renders inside a Dialog; callers are responsible for that rule.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-[15px] font-semibold px-[18px] transition-[transform,background-color] duration-100 active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte focus-visible:ring-offset-2 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-monte text-paper active:bg-monte-pressed",
        ink: "bg-ink text-paper active:opacity-90",
        secondary: "bg-sand text-ink active:opacity-90",
        link: "bg-transparent text-monte underline underline-offset-[3px] px-0",
        destructive: "bg-ladrillo text-paper active:opacity-90",
      },
      size: {
        default: "h-12",
        sm: "h-9 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Shows a 14px spinner and swaps the label for its gerund form (§6.1). */
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  loadingLabel,
  disabled,
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled ?? loading;
  return (
    <button
      type="button"
      className={cn(
        buttonVariants({ variant, size }),
        isDisabled && "bg-line text-ink-3 pointer-events-none",
        className
      )}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading && <Loader2 className="size-[14px] animate-spin" strokeWidth={1.75} />}
      {loading ? loadingLabel ?? children : children}
    </button>
  );
}
