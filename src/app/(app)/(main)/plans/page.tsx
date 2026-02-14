import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  CheckCheck,
  Clock,
  ArrowRight,
  Plus,
  User,
  Users,
  Baby,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { durationLabel } from "@/lib/plan-duration";
import { spacing } from "@/lib/design-tokens";
import { BackButton } from "@/components/ui/back-button";

import type { MemberType, WeeklyPlanStatus } from "@prisma/client";

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

function formatTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const diffMs = new Date(expiresAt).getTime() - now.getTime();
  if (diffMs <= 0) return "Vencido";
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `Vence en ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Vence en ${diffDays}d`;
}

const STATUS_CONFIG: Record<WeeklyPlanStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  PENDING: {
    label: "Pendiente",
    color: "text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-700",
    bgColor: "bg-amber-100 dark:bg-amber-900",
    icon: <Clock className="h-5 w-5 text-amber-600" />,
  },
  APPLIED: {
    label: "Aplicado",
    color: "text-green-700 border-green-300 dark:text-green-300 dark:border-green-700",
    bgColor: "bg-green-100 dark:bg-green-900",
    icon: <CheckCheck className="h-5 w-5 text-green-600" />,
  },
  COMPLETED: {
    label: "Finalizado",
    color: "border-green-200 text-green-700 dark:border-green-800 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-900",
    icon: <CheckCheck className="h-5 w-5 text-green-600" />,
  },
  EXPIRED: {
    label: "Expirado",
    color: "border-muted text-muted-foreground",
    bgColor: "bg-muted",
    icon: <Clock className="h-5 w-5 text-muted-foreground" />,
  },
  REJECTED: {
    label: "Rechazado",
    color: "border-muted text-muted-foreground",
    bgColor: "bg-muted",
    icon: <Clock className="h-5 w-5 text-muted-foreground" />,
  },
};

export default async function PlansPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const aiEnabled = isAIEnabled();

  if (!aiEnabled) {
    redirect("/my-tasks");
  }

  // Fetch active plan (PENDING or APPLIED, not expired) and past plans
  const [activePlan, pastPlans] = await Promise.all([
    prisma.weeklyPlan.findFirst({
      where: {
        householdId: member.householdId,
        status: { in: ["PENDING", "APPLIED"] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.weeklyPlan.findMany({
      where: {
        householdId: member.householdId,
        OR: [
          { status: { in: ["COMPLETED", "EXPIRED", "REJECTED"] } },
          { status: { in: ["APPLIED"] }, expiresAt: { lte: new Date() } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      {/* Header */}
      <div className={spacing.pageHeader}>
        <BackButton />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              Planes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestiona la distribución de tareas en tu hogar
            </p>
          </div>
          {!activePlan && (
            <Button asChild size="sm" className="gap-2">
              <Link href="/plan">
                <Plus className="h-4 w-4" />
                Generar plan
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Active plan */}
      {activePlan && (
        <div className={spacing.sectionGapLg}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Plan en curso</h2>
          <ActivePlanCard plan={activePlan} />
        </div>
      )}

      {/* Past plans */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          {pastPlans.length === 0
            ? "Historial"
            : `Planes anteriores (${pastPlans.length})`}
        </h2>
        {pastPlans.length === 0 ? (
          <div className="rounded-2xl bg-muted/30 p-8 text-center">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Acá vas a ver tus planes pasados</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuando completes tu primer plan, aparecerá en el historial para que puedas comparar semana a semana.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pastPlans.map((plan) => (
              <PastPlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PlanCardPlan {
  id: string;
  status: WeeklyPlanStatus;
  balanceScore: number;
  durationDays: number;
  assignments: unknown;
  notes: string[];
  createdAt: Date;
  appliedAt: Date | null;
  expiresAt: Date;
}

function ActivePlanCard({ plan }: { plan: PlanCardPlan }) {
  const assignments = plan.assignments as unknown as PlanAssignment[];
  const memberCount = new Set(assignments.map((a) => a.memberName)).size;
  const taskCount = assignments.length;
  const config = STATUS_CONFIG[plan.status];
  const isApplied = plan.status === "APPLIED";
  const isPending = plan.status === "PENDING";

  // Group assignments by member
  const assignmentsByMember = new Map<string, PlanAssignment[]>();
  for (const assignment of assignments) {
    const existing = assignmentsByMember.get(assignment.memberName) ?? [];
    existing.push(assignment);
    assignmentsByMember.set(assignment.memberName, existing);
  }

  return (
    <Link href="/plan" className="block">
      <div className={cn(
        "rounded-2xl bg-white shadow-sm overflow-hidden border transition-shadow hover:shadow-md",
        isPending ? "border-amber-200" : "border-green-200"
      )}>
        {/* Top accent bar */}
        <div className={cn(
          "h-1",
          isPending ? "bg-amber-400" : "bg-green-400"
        )} />

        {/* Content */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className={cn("shrink-0 rounded-full p-2", config.bgColor)}>
              {config.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">
                  Plan de {durationLabel(plan.durationDays)}
                </p>
                <Badge variant="outline" className={cn("text-xs", config.color)}>
                  {config.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {taskCount} {taskCount === 1 ? "tarea" : "tareas"} · {memberCount} {memberCount === 1 ? "miembro" : "miembros"}
                {isApplied && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5">
                    <Timer className="h-3 w-3" />
                    {formatTimeRemaining(plan.expiresAt)}
                  </span>
                )}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </div>
        </div>

        {/* Assignments preview */}
        <div className="border-t border-muted/60 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {Array.from(assignmentsByMember.entries()).map(([memberName, memberAssignments]) => {
              const memberType = memberAssignments[0]?.memberType ?? "ADULT";
              return (
                <div key={memberName} className="flex items-center gap-1.5 text-sm">
                  {MEMBER_TYPE_ICONS[memberType]}
                  <span className="font-medium">{memberName}</span>
                  <span className="text-muted-foreground">({memberAssignments.length})</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Link>
  );
}

function PastPlanCard({ plan }: { plan: PlanCardPlan }) {
  const assignments = plan.assignments as unknown as PlanAssignment[];
  const memberCount = new Set(assignments.map((a) => a.memberName)).size;
  const taskCount = assignments.length;
  const config = STATUS_CONFIG[plan.status];

  // Group assignments by member
  const assignmentsByMember = new Map<string, PlanAssignment[]>();
  for (const assignment of assignments) {
    const existing = assignmentsByMember.get(assignment.memberName) ?? [];
    existing.push(assignment);
    assignmentsByMember.set(assignment.memberName, existing);
  }

  return (
    <details className="group rounded-2xl bg-white shadow-sm">
      {/* Summary row */}
      <summary className="flex cursor-pointer items-center gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
        <div className={cn("shrink-0 rounded-full p-2", config.bgColor)}>
          {config.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              Plan de {durationLabel(plan.durationDays)}
            </p>
            <Badge variant="outline" className={cn("text-xs", config.color)}>
              {config.label}
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
                      <CheckCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span>{assignment.taskName}</span>
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
}
