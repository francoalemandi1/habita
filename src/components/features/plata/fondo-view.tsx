"use client";

import { FondoContent } from "./fondo/fondo-content";

import type { PlataViewProps } from "./plata-view-props";

export function FondoView(props: PlataViewProps): React.JSX.Element {
  return <FondoContent {...props} />;
}
