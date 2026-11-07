import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { APP_ROUTES } from "@habita/contracts";
import { EmptyState } from "@/components/ds/empty-state";
import { CalendarDays } from "lucide-react";
import { TareasDetailHeader } from "@/components/features/tareas/tareas-detail-header";
import { PlanHistoryCard } from "@/components/features/tareas/plan-history-card";

import { parsePlanAssignments } from "./plan-assignment-lite";

export default async function TareasPlanHistorialPage() {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }
  if (!isAIEnabled()) {
    redirect(APP_ROUTES.tareas);
  }

  const pastPlans = await prisma.weeklyPlan.findMany({
    where: {
      householdId: member.householdId,
      OR: [
        { status: { in: ["COMPLETED", "EXPIRED", "REJECTED"] } },
        { status: "APPLIED", expiresAt: { lte: new Date() } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, status: true, balanceScore: true, createdAt: true, assignments: true },
  });

  const entries = pastPlans.map((plan) => {
    const assignments = parsePlanAssignments(plan.assignments);
    return {
      id: plan.id,
      status: plan.status,
      balanceScore: plan.balanceScore,
      createdAt: plan.createdAt,
      taskCount: assignments.length,
      memberCount: new Set(assignments.map((a) => a.memberName)).size,
    };
  });

  return (
    <div className="container max-w-2xl px-4 py-6 sm:py-8">
      <TareasDetailHeader title="Historial de planes" backHref={APP_ROUTES.tareas} />
      <div className="mt-4 flex flex-col gap-3">
        {entries.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Acá vas a ver tus planes pasados"
            description="Cuando completes tu primer plan, aparece en el historial."
          />
        ) : (
          entries.map((plan) => <PlanHistoryCard key={plan.id} plan={plan} />)
        )}
      </div>
    </div>
  );
}
