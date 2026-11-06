import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { NotificationPreferencesList } from "@/components/features/perfil/notification-preferences-list";
import { QuietHoursCard } from "@/components/features/perfil/quiet-hours-card";

export const metadata = {
  title: "Avisos · Perfil",
};

export default async function PerfilAvisosPage(): Promise<React.JSX.Element> {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  return (
    <div className="container max-w-4xl space-y-6 px-4 py-6 sm:py-8 md:px-8">
      <h1 className="text-[22px] font-bold text-ink">Avisos</h1>

      <section className="space-y-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[.04em] text-ink-2">Qué recibir</h2>
        <NotificationPreferencesList />
      </section>

      <section className="space-y-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[.04em] text-ink-2">Horario</h2>
        <QuietHoursCard initialStart={member.quietHoursStart} initialEnd={member.quietHoursEnd} />
      </section>
    </div>
  );
}
