"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * §6.14 — mobile is a bottom sheet (built by the mobile worker); web renders
 * as a centered 520px modal, 24px radius, per the handoff's explicit web rule.
 * Web keeps one close affordance (the X); the body scrolls so long forms never
 * push the modal past the viewport.
 */
export function Sheet({ open, onOpenChange, title, children, className }: SheetProps): React.JSX.Element {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim animate-[fade-in_180ms_ease-out]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[min(85vh,760px)] w-[520px] max-w-[calc(100%-40px)] -translate-x-1/2 -translate-y-1/2 flex-col",
            "rounded-[24px] bg-paper shadow-level-2 outline-none animate-[fade-in_180ms_ease-out]",
            className
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 py-3 pl-5 pr-3">
            <DialogPrimitive.Title className="min-w-0 truncate text-[17px] font-semibold text-ink">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Cerrar"
              className="flex size-10 shrink-0 items-center justify-center rounded-[10px] text-ink-2 outline-none transition-colors duration-100 hover:bg-sand hover:text-ink focus-visible:ring-2 focus-visible:ring-monte"
            >
              <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
