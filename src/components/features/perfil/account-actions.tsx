"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LeaveHouseholdDialog } from "@/components/features/perfil/leave-household-dialog";

export interface AccountActionsProps {
  householdName: string;
}

/** §5.3 Perfil — "Cerrar sesión" (Tinta 2 link) and "Salir de la casa" (Ladrillo), opening the D dialog. */
export function AccountActions({ householdName }: AccountActionsProps): React.JSX.Element {
  const [leaveOpen, setLeaveOpen] = useState(false);

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="text-[15px] font-medium text-ink-2">
        Cerrar sesión
      </button>
      <button type="button" onClick={() => setLeaveOpen(true)} className="text-[15px] font-medium text-ladrillo">
        Salir de la casa
      </button>
      <LeaveHouseholdDialog open={leaveOpen} onOpenChange={setLeaveOpen} householdName={householdName} />
    </div>
  );
}
