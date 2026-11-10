"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { DoorOpen, LogOut } from "lucide-react";
import { ListRow } from "@/components/ds/list-row";
import { LeaveHouseholdDialog } from "@/components/features/perfil/leave-household-dialog";

export interface AccountActionsProps {
  householdName: string;
}

/**
 * §5.3 Perfil — account actions as real rows, not loose text links, so they read as
 * actions. "Salir de la casa" is the danger row and still confirms in a dialog (§6.1).
 */
export function AccountActions({ householdName }: AccountActionsProps): React.JSX.Element {
  const [leaveOpen, setLeaveOpen] = useState(false);

  return (
    <section aria-labelledby="perfil-cuenta" className="flex flex-col gap-2">
      <h2 id="perfil-cuenta" className="text-[13px] font-semibold uppercase tracking-[.04em] text-ink-2">Cuenta</h2>
      <div className="rounded-[20px] bg-surface px-2">
        <ListRow
          leadingIcon={LogOut}
          title="Cerrar sesión"
          meta="Salís de Habita en este dispositivo"
          onClick={() => signOut({ callbackUrl: "/" })}
        />
        <ListRow
          leadingIcon={DoorOpen}
          title="Salir de la casa"
          meta={`Dejás de ser parte de ${householdName}`}
          tone="danger"
          onClick={() => setLeaveOpen(true)}
        />
      </div>
      <LeaveHouseholdDialog open={leaveOpen} onOpenChange={setLeaveOpen} householdName={householdName} />
    </section>
  );
}
