import { SegmentedControl } from "@/components/ds";

export type TareasSegment = "semana" | "lista" | "reparto";

const OPTIONS: Array<{ value: TareasSegment; label: string }> = [
  { value: "semana", label: "Semana" },
  { value: "lista", label: "Lista" },
  { value: "reparto", label: "Reparto" },
];

export function isTareasSegment(value: string | undefined): value is TareasSegment {
  return value === "semana" || value === "lista" || value === "reparto";
}

interface TareasSegmentsProps {
  value: TareasSegment;
  onValueChange: (value: TareasSegment) => void;
}

/** Tareas level-0 Semana/Lista/Reparto switcher, driven by the `v` search param. */
export function TareasSegments({ value, onValueChange }: TareasSegmentsProps): React.JSX.Element {
  return (
    <SegmentedControl
      options={OPTIONS}
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel="Secciones de Tareas"
    />
  );
}
