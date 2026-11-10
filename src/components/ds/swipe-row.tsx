"use client";

import * as React from "react";
import { Check, ArrowRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ListRow } from "./list-row";

import type { ListRowProps } from "./list-row";

export interface SwipeRowAction {
  label: string;
  onAction: () => void;
}

export interface SwipeRowProps extends ListRowProps {
  /** Mobile swipe-right action ("Hecha"); web exposes it as a hover button instead. */
  primaryAction?: SwipeRowAction;
  /** Mobile swipe-left "Pasar" action; web exposes it as a hover button. */
  passAction?: SwipeRowAction;
  /** Mobile swipe-left "Borrar" action; web exposes it as a hover button. */
  deleteAction?: SwipeRowAction;
}

const ACTION_BUTTON =
  "flex size-9 items-center justify-center rounded-[10px] text-ink-2 outline-none transition-colors duration-100 hover:bg-sand hover:text-ink focus-visible:ring-2 focus-visible:ring-monte";

/**
 * §6.12 — on mobile this swipes; the handoff is explicit that web has no
 * swipe gesture, so here it's a plain ListRow with the same actions as quiet icon
 * buttons: revealed on hover or keyboard focus, and always visible on touch screens
 * (no hover there, and Ladrillo stays reserved for at most two elements per screen, §9.1).
 */
export function SwipeRow({ primaryAction, passAction, deleteAction, ...rowProps }: SwipeRowProps): React.JSX.Element {
  return (
    <div className="group relative">
      <ListRow {...rowProps} />
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-1 bg-surface opacity-0 group-hover:bg-[color-mix(in_srgb,var(--color-paper)_60%,var(--color-surface))] transition-opacity duration-180 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onAction}
            aria-label={primaryAction.label}
            className={cn(ACTION_BUTTON, "text-monte hover:text-monte")}
          >
            <Check className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
        {passAction && (
          <button
            type="button"
            onClick={passAction.onAction}
            aria-label={passAction.label}
            className={ACTION_BUTTON}
          >
            <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
        {deleteAction && (
          <button
            type="button"
            onClick={deleteAction.onAction}
            aria-label={deleteAction.label}
            className={cn(ACTION_BUTTON, "hover:bg-ladrillo-soft hover:text-ladrillo-text")}
          >
            <Trash2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
