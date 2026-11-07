"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Left side of the header: "Cancelar" (default) or a custom back action. */
  cancelLabel?: string;
  title?: string;
  /** Right side header action, e.g. "Guardar". */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * §6.14 — mobile is a bottom sheet (built by the mobile worker); web renders
 * as a centered 520px modal, 24px radius, per the handoff's explicit web rule.
 */
export function Sheet({ open, onOpenChange, cancelLabel = "Cancelar", title, headerAction, children, className }: SheetProps): React.JSX.Element {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[520px] max-w-[calc(100%-40px)] -translate-x-1/2 -translate-y-1/2",
            "rounded-[24px] bg-paper shadow-level-2 outline-none",
            className
          )}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <DialogPrimitive.Close className="text-[15px] font-medium text-monte">
              {cancelLabel}
            </DialogPrimitive.Close>
            {title && (
              <DialogPrimitive.Title className="text-[16px] font-semibold text-ink">{title}</DialogPrimitive.Title>
            )}
            {headerAction ?? (
              <DialogPrimitive.Close aria-label="Cerrar" className="text-ink-2">
                <X className="size-5" strokeWidth={1.75} />
              </DialogPrimitive.Close>
            )}
          </div>
          <div className="px-5 pb-8">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
