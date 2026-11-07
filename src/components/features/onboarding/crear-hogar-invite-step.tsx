import { InviteShareBlock } from "@/components/features/invite-share-block";

interface CrearHogarInviteStepProps {
  inviteCode: string;
  householdName: string;
}

/** Crear hogar — step 2 (Invitar, skippable), per handoff §5.3. */
export function CrearHogarInviteStep({ inviteCode, householdName }: CrearHogarInviteStepProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.035em] text-ink">
        Invitá a tu casa
      </h1>
      <InviteShareBlock inviteCode={inviteCode} householdName={householdName} />
    </div>
  );
}
