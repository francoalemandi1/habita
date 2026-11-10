"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LeaveHouseholdDialog } from "@/components/features/perfil/leave-household-dialog";
import { cn } from "@/lib/utils";

// Text-styled actions still need a 44px hit area (§6.2) and a visible keyboard focus.
const ACCOUNT_ACTION =
  "min-h-11 rounded-[12px] px-4 text-[15px] font-medium outline-none transition-colors duration-100 hover:bg-surface focus-visible:ring-2 focus-visible:ring-monte";

export interface AccountActionsProps {
  householdName: string;
}

/** §5.3 Perfil — "Cerrar sesión" (Tinta 2 link) and "Salir de la casa" (Ladrillo), opening the D dialog. */
export function AccountActions({ householdName }: AccountActionsProps): React.JSX.Element {
  const [leaveOpen, setLeaveOpen] = useState(false);

  return (
    <div className="flex flex-col items-center gap-1 py-4">
      <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={cn(ACCOUNT_ACTION, "text-ink-2")}>
        Cerrar sesión
      </button>
      <button type="button" onClick={() => setLeaveOpen(true)} className={cn(ACCOUNT_ACTION, "text-ladrillo-text")}>
        Salir de la casa
      </button>
      <LeaveHouseholdDialog open={leaveOpen} onOpenChange={setLeaveOpen} householdName={householdName} />
    </div>
  );
}
