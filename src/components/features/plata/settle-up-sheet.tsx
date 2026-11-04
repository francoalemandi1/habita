"use client";

import { SettleUpSheetContent } from "./settle/settle-up-sheet-content";

import type { SettleUpSheetProps } from "./plata-view-props";

/** §7 pattern C "Liquidar saldos" — sheet with the minimal transfers. */
export function SettleUpSheet(props: SettleUpSheetProps): React.JSX.Element {
  return <SettleUpSheetContent {...props} />;
}
