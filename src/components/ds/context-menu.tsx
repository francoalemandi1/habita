"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

export interface ContextMenuItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** Marks the row Ladrillo — §6.17 reserves this for the last, destructive row. */
  destructive?: boolean;
}

export interface ContextMenuProps {
  trigger: React.ReactNode;
  items: ContextMenuItemConfig[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** §6.17 — 240px menu, 16px radius, level-1 shadow, blurred scrim behind it. */
export function ContextMenu({ trigger, items, open, onOpenChange }: ContextMenuProps): React.JSX.Element {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <div className="fixed inset-0 z-40 bg-paper/60 backdrop-blur-[6px]" aria-hidden="true" />
        <PopoverPrimitive.Content
          role="menu"
          sideOffset={6}
          className="z-50 w-60 rounded-[16px] bg-surface p-1 shadow-level-1 outline-none"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.onSelect();
                  onOpenChange(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[12px] px-3 py-3.5 text-left text-[13px]",
                  item.destructive ? "text-ladrillo" : "text-ink"
                )}
              >
                <Icon className="size-[17px]" strokeWidth={1.75} />
                {item.label}
              </button>
            );
          })}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
