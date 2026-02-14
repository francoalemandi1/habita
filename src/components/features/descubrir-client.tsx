"use client";

import { useState } from "react";
import { RelaxClient } from "@/components/features/relax-client";
import { CocinaClient } from "@/components/features/cocina-client";
import { Button } from "@/components/ui/button";
import { Sparkles, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

import type { RelaxEvent } from "@/lib/llm/relax-finder";

type DescubrirTab = "planes" | "cocina";

interface DescubrirClientProps {
  aiEnabled: boolean;
  hasHouseholdLocation: boolean;
  householdCity: string | null;
  cachedCultureEvents: RelaxEvent[] | null;
  cachedCultureAt: string | null;
  householdSize: number;
}

export function DescubrirClient({
  aiEnabled,
  hasHouseholdLocation,
  householdCity,
  cachedCultureEvents,
  cachedCultureAt,
  householdSize,
}: DescubrirClientProps) {
  const [activeTab, setActiveTab] = useState<DescubrirTab>("planes");

  return (
    <>
      {/* Tab switcher */}
      <div className="mb-6 flex items-center rounded-lg border bg-muted p-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab("planes")}
          className={cn(
            "flex-1 gap-2 rounded-md",
            activeTab === "planes" && "bg-background shadow-sm",
          )}
        >
          <Sparkles className="h-4 w-4" />
          Planes
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab("cocina")}
          className={cn(
            "flex-1 gap-2 rounded-md",
            activeTab === "cocina" && "bg-background shadow-sm",
          )}
        >
          <ChefHat className="h-4 w-4" />
          Recetas
        </Button>
      </div>

      {/* Tab content */}
      {activeTab === "planes" ? (
        <RelaxClient
          aiEnabled={aiEnabled}
          hasHouseholdLocation={hasHouseholdLocation}
          householdCity={householdCity}
          cachedCultureEvents={cachedCultureEvents}
          cachedCultureAt={cachedCultureAt}
        />
      ) : (
        <CocinaClient aiEnabled={aiEnabled} householdSize={householdSize} />
      )}
    </>
  );
}
