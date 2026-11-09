"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./lib/button-variants";

import type { VariantProps } from "class-variance-authority";

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
  const isDisabled = Boolean(disabled) || loading;
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
