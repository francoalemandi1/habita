"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  cachedActivitiesEvents: RelaxEvent[] | null;
  cachedActivitiesAt: string | null;
  householdSize: number;
  platformEventCount: number;
}

export function DescubrirClient({
  aiEnabled,
  hasHouseholdLocation,
  householdCity,
  cachedActivitiesEvents,
  cachedActivitiesAt,
  householdSize,
  platformEventCount,
}: DescubrirClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") === "cocina" ? "cocina" : "planes") as DescubrirTab;

  const setActiveTab = useCallback(
    (tab: DescubrirTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "planes") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(query ? `?${query}` : window.location.pathname, { scroll: false });
    },
    [router, searchParams],
  );

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
          cachedActivitiesEvents={cachedActivitiesEvents}
          cachedActivitiesAt={cachedActivitiesAt}
          platformEventCount={platformEventCount}
        />
      ) : (
        <CocinaClient aiEnabled={aiEnabled} householdSize={householdSize} />
      )}
    </>
  );
}
