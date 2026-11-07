import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { SumarView } from "@/components/features/tareas/sumar-view";

export default async function TareasSumarPage() {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <SumarView />
    </div>
  );
}
