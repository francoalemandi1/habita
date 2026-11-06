"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { z } from "zod";
import { APP_ROUTES } from "@habita/contracts";
import { Dialog } from "@/components/ds/dialog";
import { apiFetch, ApiError } from "@/lib/api-client";
import { describeLeaveHouseholdError, resolveAfterLeaveRoute } from "@/lib/perfil-logic";

export interface LeaveHouseholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdName: string;
}

const ONBOARDING_ROUTE = "/onboarding";
const leaveResponseSchema = z.object({ nextHouseholdId: z.string().nullable() });

/** §5.3 Perfil — D dialog: typing the household name enables "Salir de la casa". */
export function LeaveHouseholdDialog({ open, onOpenChange, householdName }: LeaveHouseholdDialogProps): React.JSX.Element {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  async function switchToNextHousehold(householdId: string): Promise<void> {
    // The leave already succeeded: a failed switch must not surface as "No se pudo salir".
    try {
      await apiFetch("/api/households/switch", { method: "POST", body: { householdId } });
    } catch (error) {
      console.warn("Left the household but could not switch to the next one", error);
    }
  }

  async function handleConfirm(): Promise<void> {
    if (isLeaving) return;
    setIsLeaving(true);
    setErrorMessage(null);
    try {
      const result = leaveResponseSchema.parse(await apiFetch<unknown>("/api/members/me/leave", { method: "POST" }));
      onOpenChange(false);
      const route = resolveAfterLeaveRoute(result.nextHouseholdId);
      if (route.action === "switch") {
        await switchToNextHousehold(route.householdId);
        router.push(APP_ROUTES.casa);
      } else {
        router.push(ONBOARDING_ROUTE);
      }
      router.refresh();
    } catch (error) {
      const code = error instanceof ApiError ? error.code : undefined;
      setErrorMessage(describeLeaveHouseholdError(code));
      if (!(error instanceof ApiError) || error.status !== 409) {
        console.warn("No se pudo salir de la casa", error);
      }
    } finally {
      setIsLeaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      icon={<LogOut className="size-5 text-ladrillo" strokeWidth={1.75} />}
      title={`Salir de ${householdName}`}
      body={errorMessage ?? `Vas a dejar de ver las tareas y gastos de "${householdName}". Para confirmar, escribí el nombre de la casa.`}
      confirmLabel={isLeaving ? "Saliendo" : "Salir de la casa"}
      confirmNameRequired={householdName}
      confirmTone="destructive"
      onConfirm={() => void handleConfirm()}
    />
  );
}
