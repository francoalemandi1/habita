import { redirect } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { getCurrentMember } from "@/lib/session";
import { isAIEnabled } from "@/lib/llm/provider";
import { APP_ROUTES } from "@habita/contracts";
import { PlanView } from "@/components/features/tareas/plan-view";

export default async function TareasPlanPage() {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }
  if (!isAIEnabled()) {
    redirect(APP_ROUTES.tareas);
  }

  return (
    <div className="container max-w-2xl px-4 py-6 sm:py-8">
      <Link
        href={APP_ROUTES.tareas}
        aria-label="Cerrar"
        className="mb-4 inline-flex size-9 items-center justify-center rounded-full bg-sand text-ink"
      >
        <X className="size-4" strokeWidth={1.75} />
      </Link>
      <PlanView />
    </div>
  );
}
