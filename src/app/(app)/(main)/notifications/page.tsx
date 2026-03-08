import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { NotificationsPage } from "@/components/features/notifications-page";

export const metadata = {
  title: "Notificaciones",
};

export default async function NotificationsServerPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <NotificationsPage />
    </div>
  );
}
