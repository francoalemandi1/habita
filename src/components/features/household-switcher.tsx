"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface HouseholdOption {
  id: string;
  name: string;
}

interface HouseholdSwitcherProps {
  households: HouseholdOption[];
  currentHouseholdId: string;
  className?: string;
}

export function HouseholdSwitcher({
  households,
  currentHouseholdId,
  className,
}: HouseholdSwitcherProps) {
  const [switching, setSwitching] = useState(false);
  const router = useRouter();

  if (households.length <= 1) return null;

  const handleChange = async (householdId: string) => {
    if (householdId === currentHouseholdId) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/households/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className={cn("relative flex items-center gap-1", className)}>
      {switching && (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
      )}
      <select
        value={currentHouseholdId}
        onChange={(e) => handleChange(e.target.value)}
        disabled={switching}
        className="max-w-[10rem] rounded-xl border border-border/80 bg-transparent py-2.5 pl-8 pr-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 md:max-w-[12rem]"
        aria-label="Cambiar de hogar"
      >
        {households.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
      <Home className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground" />
    </div>
  );
}
