"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SegmentedControl } from "@/components/ds/segmented-control";

export type SuperViewKey = "lista" | "comparar" | "ofertas";

interface SuperSegmentsProps {
  active: SuperViewKey;
}

const OPTIONS: Array<{ value: SuperViewKey; label: string }> = [
  { value: "lista", label: "Lista" },
  { value: "comparar", label: "Comparar" },
  { value: "ofertas", label: "Ofertas" },
];

/** Switches the Súper view via `?v=` (handoff §5.3), without a full navigation. */
export function SuperSegments({ active }: SuperSegmentsProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: SuperViewKey): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "lista") {
      params.delete("v");
    } else {
      params.set("v", value);
    }
    const query = params.toString();
    router.replace(query ? `/super?${query}` : "/super", { scroll: false });
  }

  return <SegmentedControl options={OPTIONS} value={active} onChange={handleChange} />;
}
