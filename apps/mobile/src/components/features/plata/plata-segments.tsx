import { SegmentedControl } from "@/components/ds";

export type PlataSegment = "gastos" | "saldos" | "fondo";

const OPTIONS: Array<{ value: PlataSegment; label: string }> = [
  { value: "gastos", label: "Gastos" },
  { value: "saldos", label: "Saldos" },
  { value: "fondo", label: "Fondo" },
];

export function isPlataSegment(value: string | undefined): value is PlataSegment {
  return value === "gastos" || value === "saldos" || value === "fondo";
}

interface PlataSegmentsProps {
  value: PlataSegment;
  onValueChange: (value: PlataSegment) => void;
}

/** Plata level-0 Gastos/Saldos/Fondo switcher, driven by the `v` search param. */
export function PlataSegments({ value, onValueChange }: PlataSegmentsProps): React.JSX.Element {
  return (
    <SegmentedControl
      options={OPTIONS}
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel="Secciones de Plata"
    />
  );
}
