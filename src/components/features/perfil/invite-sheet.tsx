"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { ListRow } from "@/components/ds/list-row";
import { Sheet } from "@/components/ds/sheet";
import { InviteShareBlock } from "@/components/features/invite-share-block";

export interface InviteSheetProps {
  inviteCode: string;
  householdName: string;
}

/** §5.3 Perfil — "Invitar" row opens a sheet with the invite link/code (reuses InviteShareBlock). */
export function InviteRow({ inviteCode, householdName }: InviteSheetProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ListRow leadingIcon={UserPlus} title="Invitar a alguien" meta="Compartí el link o el código de la casa" onClick={() => setOpen(true)} />
      <Sheet open={open} onOpenChange={setOpen} title="Invitar">
        <InviteShareBlock inviteCode={inviteCode} householdName={householdName} />
      </Sheet>
    </>
  );
}
