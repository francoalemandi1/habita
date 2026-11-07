"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SegmentedControl } from "@/components/ds/segmented-control";

export type TareasViewKey = "semana" | "lista" | "reparto";

interface TareasSegmentsProps {
  active: TareasViewKey;
}

const OPTIONS: Array<{ value: TareasViewKey; label: string }> = [
  { value: "semana", label: "Semana" },
  { value: "lista", label: "Lista" },
  { value: "reparto", label: "Reparto" },
];

/** Switches the Tareas view via `?v=` (handoff §5.3), without a full navigation. */
export function TareasSegments({ active }: TareasSegmentsProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: TareasViewKey): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "semana") {
      params.delete("v");
    } else {
      params.set("v", value);
    }
    const query = params.toString();
    router.replace(query ? `/tareas?${query}` : "/tareas", { scroll: false });
  }

  return <SegmentedControl options={OPTIONS} value={active} onChange={handleChange} />;
}
