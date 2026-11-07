import type { MemberType } from "@habita/contracts";

/** Shared contract between the Plata screen shell and its views. */
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
  visible: boolean;
  onClose: () => void;
}
