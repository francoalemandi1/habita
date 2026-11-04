import type { MemberType } from "@prisma/client";

/** Shared contract between the Plata page shell and its client views. */
export interface PlataMember {
  id: string;
  name: string;
}

export interface PlataViewProps {
  currentMemberId: string;
  currentMemberType: MemberType;
  members: PlataMember[];
}

export interface SettleUpSheetProps extends PlataViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
