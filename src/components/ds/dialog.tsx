"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { isConfirmNameMatch } from "./lib/dialog-logic";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: React.ReactNode;
  /** Object name, interpolated into the title per §6.16. */
  title: string;
  /** Explains the consequence of confirming. */
  body: string;
  cancelLabel?: string;
  /** Destructive confirm button — only ever rendered inside Dialog (§6.1). */
  confirmLabel: string;
  onConfirm: () => void;
  /** When set, the confirm button stays disabled until this exact name is typed (§6.16). */
  confirmNameRequired?: string;
  confirmTone?: "destructive" | "primary";
}

/** §6.16 — centered, Hoja (surface) bg, 24px radius, 24px padding, focus trap + Esc via Radix. */
export function Dialog({
  open,
  onOpenChange,
  icon,
  title,
  body,
  cancelLabel = "Cancelar",
  confirmLabel,
  onConfirm,
  confirmNameRequired,
  confirmTone = "destructive",
}: DialogProps): React.JSX.Element {
  const [typedName, setTypedName] = React.useState("");
  const confirmDisabled = confirmNameRequired ? !isConfirmNameMatch(typedName, confirmNameRequired) : false;

  React.useEffect(() => {
    if (!open) setTypedName("");
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-56px)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-[24px] bg-surface p-6 shadow-level-2"
          )}
        >
          {icon && (
            <div className="mb-4 flex size-11 items-center justify-center rounded-[12px] bg-sand">{icon}</div>
          )}
          <DialogPrimitive.Title className="text-[22px] font-bold text-ink">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-[15px] text-ink-2">{body}</DialogPrimitive.Description>
          {confirmNameRequired && (
            <input
              value={typedName}
              onChange={(event) => setTypedName(event.target.value)}
              placeholder={`Escribí ${confirmNameRequired} para confirmar`}
              aria-label={`Escribí ${confirmNameRequired} para confirmar`}
              className="mt-4 h-11 w-full rounded-[12px] border border-line bg-paper px-3 text-[15px] text-ink outline-none"
            />
          )}
          <div className="mt-6 flex justify-end gap-2">
            <DialogPrimitive.Close className="h-11 rounded-[12px] bg-sand px-4 text-[15px] font-semibold text-ink">
              {cancelLabel}
            </DialogPrimitive.Close>
            <button
              type="button"
              disabled={confirmDisabled}
              onClick={onConfirm}
              className={cn(
                "h-11 rounded-[12px] px-4 text-[15px] font-semibold text-paper disabled:bg-line disabled:text-ink-3",
                confirmTone === "destructive" ? "bg-ladrillo" : "bg-monte"
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
