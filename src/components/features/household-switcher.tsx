"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useSnackbar } from "@/components/ds/snackbar";

interface HouseholdOption {
  id: string;
  name: string;
}

interface HouseholdSwitcherProps {
  households: HouseholdOption[];
  currentHouseholdId: string;
  className?: string;
}

/**
 * §6.15 household row. A native <select> sits invisibly on top of the styled row,
 * so keyboard, screen readers and mobile pickers all work without a custom listbox.
 */
export function HouseholdSwitcher({ households, currentHouseholdId, className }: HouseholdSwitcherProps) {
  const [isSwitching, setIsSwitching] = useState(false);
  const router = useRouter();
  const snackbar = useSnackbar();
  const currentName = households.find((household) => household.id === currentHouseholdId)?.name ?? "";

  async function handleChange(householdId: string): Promise<void> {
    if (householdId === currentHouseholdId) return;
    setIsSwitching(true);
    try {
      await apiFetch("/api/households/switch", { method: "POST", body: { householdId } });
      router.refresh();
    } catch (error) {
      console.error("[household-switcher] switch failed:", error);
      snackbar.show({ text: "No se pudo cambiar de casa", tone: "error" });
    } finally {
      setIsSwitching(false);
    }
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-2 rounded-[12px] bg-surface px-3 py-2.5 focus-within:ring-2 focus-within:ring-monte",
        className
      )}
    >
      <span className="truncate text-[15px] font-medium text-ink">{currentName}</span>
      {isSwitching ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-ink-3" aria-hidden="true" />
      ) : (
        <ChevronsUpDown className="size-4 shrink-0 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
      )}
      <select
        value={currentHouseholdId}
        onChange={(event) => void handleChange(event.target.value)}
        disabled={isSwitching}
        aria-label="Cambiar de casa"
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {households.map((household) => (
          <option key={household.id} value={household.id}>
            {household.name}
          </option>
        ))}
      </select>
    </div>
  );
}
