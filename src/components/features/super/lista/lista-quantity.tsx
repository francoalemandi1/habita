"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Stepper } from "@/components/ds/stepper";

interface ListaQuantityProps {
  itemName: string;
  quantity: number;
  isChecked: boolean;
  onChange: (quantity: number) => void;
}

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

/** Quantity reads as "×2" at rest (handoff §5.3); tapping it swaps in a stepper for that row only. */
export function ListaQuantity({ itemName, quantity, isChecked, onChange }: ListaQuantityProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function startEditing(): void {
    flushSync(() => setIsEditing(true));
    wrapperRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }

  function stopEditing(options: { restoreFocus: boolean }): void {
    flushSync(() => setIsEditing(false));
    if (options.restoreFocus) triggerRef.current?.focus();
  }

  function handleBlur(event: React.FocusEvent<HTMLDivElement>): void {
    if (!event.currentTarget.contains(event.relatedTarget)) stopEditing({ restoreFocus: false });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") stopEditing({ restoreFocus: true });
  }

  if (isChecked) {
    return <span className="min-w-11 shrink-0 px-2 text-center text-[14px] text-ink-2">×{quantity}</span>;
  }

  if (isEditing) {
    return (
      <div ref={wrapperRef} onBlur={handleBlur} onKeyDown={handleKeyDown} className="shrink-0">
        <Stepper value={quantity} onChange={onChange} min={MIN_QUANTITY} max={MAX_QUANTITY} size="sm" label={`Cantidad de ${itemName}`} />
      </div>
    );
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={startEditing}
      aria-label={`Cantidad de ${itemName}: ${quantity}. Cambiar`}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] px-2 text-[14px] text-ink-2 outline-none transition-colors duration-100 hover:bg-sand hover:text-ink focus-visible:ring-2 focus-visible:ring-monte"
    >
      ×{quantity}
    </button>
  );
}
