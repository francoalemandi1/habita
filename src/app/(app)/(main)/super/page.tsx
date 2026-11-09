import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { SuperView } from "@/components/features/super/super-view";

export default async function SuperPage(): Promise<React.JSX.Element> {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }

  return <SuperView currentMemberId={member.id} householdCity={member.household.city ?? null} />;
}
