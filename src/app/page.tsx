import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentMember } from "@/lib/session";
import { getRecommendedDashboard } from "@/lib/permissions";
import { LandingContent } from "@/components/features/landing-content";

export default async function HomePage() {
  const session = await auth();

  // If logged in, check if they have a household
  if (session?.user) {
    const member = await getCurrentMember();

    if (member) {
      const dashboard = getRecommendedDashboard(member.memberType);
      redirect(dashboard);
    } else {
      redirect("/onboarding");
    }
  }

  return <LandingContent />;
}
