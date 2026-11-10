"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { TextField } from "@/components/ds/text-field";
import { useSnackbar } from "@/components/ds/snackbar";
import { apiFetch } from "@/lib/api-client";

export interface HouseholdCardProps {
  householdName: string;
  canRename: boolean;
}

/** §5.3 Perfil — household card with its name; adults can rename it inline. */
export function HouseholdCard({ householdName, canRename }: HouseholdCardProps): React.JSX.Element {
  const snackbar = useSnackbar();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(householdName);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed || trimmed === householdName) {
      setName(householdName);
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await apiFetch("/api/households", { method: "PATCH", body: { name: trimmed } });
      setIsEditing(false);
    } catch (error) {
      console.warn("No se pudo renombrar el hogar", error);
      setName(householdName);
      snackbar.show({ text: "No se pudo guardar", tone: "error", actionKind: "retry", onAction: handleSave });
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <div className="rounded-[20px] bg-surface p-4">
        <TextField
          label="Nombre del hogar"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={50}
          autoFocus
          disabled={isSaving}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleSave();
            if (event.key === "Escape") {
              setName(householdName);
              setIsEditing(false);
            }
          }}
          onBlur={() => void handleSave()}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!canRename}
      onClick={() => setIsEditing(true)}
      className="flex w-full items-center justify-between gap-2 rounded-[20px] bg-surface p-4 text-left"
    >
      <span className="truncate text-[17px] font-semibold text-ink">{householdName}</span>
      {canRename && <Pencil className="size-4 shrink-0 text-ink-2" strokeWidth={1.75} />}
    </button>
  );
}
