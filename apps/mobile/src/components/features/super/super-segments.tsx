import { SegmentedControl } from "@/components/ds";

export type SuperSegment = "lista" | "comparar" | "ofertas";

const OPTIONS: Array<{ value: SuperSegment; label: string }> = [
  { value: "lista", label: "Lista" },
  { value: "comparar", label: "Comparar" },
  { value: "ofertas", label: "Ofertas" },
];

export function isSuperSegment(value: string | undefined): value is SuperSegment {
  return value === "lista" || value === "comparar" || value === "ofertas";
}

interface SuperSegmentsProps {
  value: SuperSegment;
  onValueChange: (value: SuperSegment) => void;
}

/** Súper Lista/Comparar/Ofertas switcher, driven by the `v` search param. */
export function SuperSegments({ value, onValueChange }: SuperSegmentsProps): React.JSX.Element {
  return (
    <SegmentedControl options={OPTIONS} value={value} onValueChange={onValueChange} accessibilityLabel="Secciones de Súper" />
  );
}
