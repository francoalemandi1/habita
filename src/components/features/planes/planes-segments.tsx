"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ds/segmented-control";
import { PlanesList } from "@/components/features/planes/planes-list";
import { SalidasPanel } from "@/components/features/planes/salidas-panel";

import type { PlanesSegment } from "@/lib/planes-logic";

const SEGMENT_OPTIONS: { value: PlanesSegment; label: string }[] = [
  { value: "eventos", label: "Eventos" },
  { value: "salidas", label: "Salidas" },
];

/** Planes top-level segments: own events vs. AI-suggested activities/restaurants. */
export function PlanesSegments(): React.JSX.Element {
  const [segment, setSegment] = useState<PlanesSegment>("eventos");

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl options={SEGMENT_OPTIONS} value={segment} onChange={setSegment} />
      {segment === "eventos" ? <PlanesList /> : <SalidasPanel />}
    </div>
  );
}
