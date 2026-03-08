import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { ProgressView } from "@/components/features/progress-view";

export const metadata = {
  title: "Progreso",
};

export default async function ProgressPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <ProgressView currentMemberId={member.id} />
    </div>
  );
}
