"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SegmentedControl } from "@/components/ds/segmented-control";

export type PlataViewKey = "gastos" | "saldos" | "fondo";

interface PlataSegmentsProps {
  active: PlataViewKey;
}

const OPTIONS: Array<{ value: PlataViewKey; label: string }> = [
  { value: "gastos", label: "Gastos" },
  { value: "saldos", label: "Saldos" },
  { value: "fondo", label: "Fondo" },
];

/** Switches the Plata view via `?v=`, without a full navigation (handoff §5.1). */
export function PlataSegments({ active }: PlataSegmentsProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: PlataViewKey): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "gastos") {
      params.delete("v");
    } else {
      params.set("v", value);
    }
    const query = params.toString();
    router.replace(query ? `/plata?${query}` : "/plata", { scroll: false });
  }

  return <SegmentedControl options={OPTIONS} value={active} onChange={handleChange} />;
}
