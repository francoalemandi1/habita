"use client";

import { SaldosContent } from "./saldos/saldos-content";

import type { PlataViewProps } from "./plata-view-props";

export function SaldosView(props: PlataViewProps): React.JSX.Element {
  return <SaldosContent {...props} />;
}
