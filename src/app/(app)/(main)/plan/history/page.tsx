import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  CheckCheck,
  Clock,
  User,
  Users,
  Baby,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { durationLabel } from "@/lib/plan-duration";
import { BackButton } from "@/components/ui/back-button";
import { spacing } from "@/lib/design-tokens";

import type { MemberType } from "@prisma/client";

interface PlanAssignment {
  taskName: string;
  memberId?: string;
  memberName: string;
  memberType: MemberType;
  reason: string;
}

const MEMBER_TYPE_ICONS: Record<MemberType, React.ReactNode> = {
  ADULT: <User className="h-4 w-4" />,
  TEEN: <Users className="h-4 w-4" />,
  CHILD: <Baby className="h-4 w-4" />,
};

const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  ADULT: "Adulto",
  TEEN: "Adolescente",
  CHILD: "Niño",
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function PlanHistoryPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const plans = await prisma.weeklyPlan.findMany({
    where: {
      householdId: member.householdId,
      status: { in: ["COMPLETED", "EXPIRED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      {/* Header */}
      <div className={spacing.pageHeader}>
        <BackButton />
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Historial de Planes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {plans.length === 0
            ? "No hay planes anteriores"
            : `${plans.length} ${plans.length === 1 ? "plan anterior" : "planes anteriores"}`}
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-2xl bg-muted/30 p-8 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Sin historial</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando finalices o expire un plan, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {plans.map((plan) => {
            const assignments = plan.assignments as unknown as PlanAssignment[];
            const memberCount = new Set(assignments.map((a) => a.memberName)).size;
            const taskCount = assignments.length;

            // Group assignments by member
            const assignmentsByMember = new Map<string, PlanAssignment[]>();
            for (const assignment of assignments) {
              const existing = assignmentsByMember.get(assignment.memberName) ?? [];
              existing.push(assignment);
              assignmentsByMember.set(assignment.memberName, existing);
            }

            const isCompleted = plan.status === "COMPLETED";

            return (
              <details key={plan.id} className="group rounded-2xl bg-white shadow-sm">
                {/* Summary row */}
                <summary className="flex cursor-pointer items-center gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
                  <div className={cn(
                    "shrink-0 rounded-full p-2",
                    isCompleted
                      ? "bg-green-100 dark:bg-green-900"
                      : "bg-muted"
                  )}>
                    {isCompleted ? (
                      <CheckCheck className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        Plan de {durationLabel(plan.durationDays)}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          isCompleted
                            ? "border-green-200 text-green-700 dark:border-green-800 dark:text-green-300"
                            : "border-muted text-muted-foreground"
                        )}
                      >
                        {isCompleted ? "Finalizado" : "Expirado"}
                      </Badge>
                      <Badge variant="outline" className={cn("text-xs font-bold", getScoreColor(plan.balanceScore))}>
                        {plan.balanceScore}% equidad
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(plan.createdAt)} · {taskCount} tareas para {memberCount} {memberCount === 1 ? "miembro" : "miembros"}
                    </p>
                  </div>
                  <svg
                    className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>

                {/* Expanded detail */}
                <div className="border-t px-4 pb-5 pt-4 sm:px-5">
                  {/* Balance score bar */}
                  <div className="mb-4">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Equidad</span>
                      <span className={cn("font-bold", getScoreColor(plan.balanceScore))}>
                        {plan.balanceScore}%
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full transition-all", getScoreBgColor(plan.balanceScore))}
                        style={{ width: `${plan.balanceScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Creado: {formatDate(plan.createdAt)}</span>
                    {plan.appliedAt && <span>Aplicado: {formatDate(plan.appliedAt)}</span>}
                    <span>Expiración: {formatDate(plan.expiresAt)}</span>
                  </div>

                  {/* Assignments by member */}
                  <div className="space-y-3">
                    {Array.from(assignmentsByMember.entries()).map(([memberName, memberAssignments]) => {
                      const memberType = memberAssignments[0]?.memberType ?? "ADULT";
                      return (
                        <div key={memberName} className="rounded-xl bg-muted/30 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2">
                            {MEMBER_TYPE_ICONS[memberType]}
                            <span className="text-sm font-semibold">{memberName}</span>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {MEMBER_TYPE_LABELS[memberType]}
                            </Badge>
                          </div>
                          <ul className="px-4 pb-3">
                            {memberAssignments.map((assignment) => (
                              <li
                                key={`${assignment.taskName}|${assignment.memberName}`}
                                className="flex items-center gap-2 py-1 text-sm"
                              >
                                <CheckCheck className="h-3.5 w-3.5 shrink-0 text-green-500" />
                                <span className="min-w-0 truncate">{assignment.taskName}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>

                  {/* Notes */}
                  {plan.notes.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Notas</p>
                      <ul className="space-y-1">
                        {plan.notes.map((note, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                            <span>•</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
