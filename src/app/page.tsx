import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentMember } from "@/lib/session";
import { LandingContent } from "@/components/features/landing-content";
import { APP_ROUTES } from "@habita/contracts";

export default async function HomePage() {
  const session = await auth();

  // If logged in, check if they have a household
  if (session?.user) {
    const member = await getCurrentMember();

    if (member) {
      redirect(APP_ROUTES.casa);
    } else {
      redirect("/onboarding");
    }
  }

  return <LandingContent />;
}
