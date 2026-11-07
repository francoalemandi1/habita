"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Error message describing how to fix the input, per §6.3. */
  error?: string;
}

/** §6.3 — label always visible above; focus switches bg to Hoja (surface) + 1.5px Monte border. */
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, id, className, disabled, ...props },
  ref
) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      <input
        id={inputId}
        ref={ref}
        disabled={disabled}
        aria-invalid={!!error}
        className={cn(
          "h-12 rounded-[12px] border border-line bg-paper px-3.5 text-[15px] text-ink outline-none transition-colors duration-180",
          "focus:border-[1.5px] focus:border-monte focus:bg-surface",
          error && "border-ladrillo",
          disabled && "text-ink-3",
          className
        )}
        {...props}
      />
      {error && <p className="text-[13px] text-ladrillo-text">{error}</p>}
    </div>
  );
});
