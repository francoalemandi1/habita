import { StatusChip } from "@/components/ds/chip";

import type { WeeklyPlanStatus } from "@prisma/client";

export interface PlanHistoryEntry {
  id: string;
  status: WeeklyPlanStatus;
  balanceScore: number;
  createdAt: Date;
  taskCount: number;
  memberCount: number;
}

const STATUS_LABEL: Record<WeeklyPlanStatus, string> = {
  PENDING: "Pendiente",
  APPLIED: "Aplicado",
  COMPLETED: "Finalizado",
  EXPIRED: "Expirado",
  REJECTED: "Rechazado",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

/** One row in `/tareas/plan/historial` — read-only, no action. */
export function PlanHistoryCard({ plan }: { plan: PlanHistoryEntry }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[16px] bg-surface p-4">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-ink">{formatDate(plan.createdAt)}</p>
        <p className="text-[13px] text-ink-2">
          {plan.taskCount} tareas · {plan.memberCount} {plan.memberCount === 1 ? "miembro" : "miembros"} · {plan.balanceScore}% equidad
        </p>
      </div>
      <StatusChip status={plan.status === "COMPLETED" || plan.status === "APPLIED" ? "al-dia" : "esperando"}>
        {STATUS_LABEL[plan.status]}
      </StatusChip>
    </div>
  );
}
