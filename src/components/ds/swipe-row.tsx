"use client";

import * as React from "react";
import { Check, ArrowRight, Trash2 } from "lucide-react";
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

/**
 * §6.12 — on mobile this swipes; the handoff is explicit that web has no
 * swipe gesture, so here it's a plain ListRow with the same actions exposed
 * as hover buttons (also reachable via ContextMenu).
 */
export function SwipeRow({ primaryAction, passAction, deleteAction, ...rowProps }: SwipeRowProps): React.JSX.Element {
  return (
    <div className="group relative">
      <ListRow {...rowProps} />
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-1 opacity-0 transition-opacity duration-180 group-hover:opacity-100">
        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onAction}
            aria-label={primaryAction.label}
            className="flex size-9 items-center justify-center rounded-full bg-monte text-paper"
          >
            <Check className="size-4" strokeWidth={1.75} />
          </button>
        )}
        {passAction && (
          <button
            type="button"
            onClick={passAction.onAction}
            aria-label={passAction.label}
            className="flex size-9 items-center justify-center rounded-full bg-sand text-ink"
          >
            <ArrowRight className="size-4" strokeWidth={1.75} />
          </button>
        )}
        {deleteAction && (
          <button
            type="button"
            onClick={deleteAction.onAction}
            aria-label={deleteAction.label}
            className="flex size-9 items-center justify-center rounded-full bg-ladrillo text-paper"
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  );
}
