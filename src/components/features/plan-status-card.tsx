"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  CheckCheck,
  Clock,
  ArrowRight,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { durationLabel } from "@/lib/plan-duration";

import type { WeeklyPlanStatus, MemberType } from "@prisma/client";

interface PlanAssignment {
  taskName: string;
  memberName: string;
  memberType: MemberType;
  reason: string;
}

interface PlanStatusCardProps {
  plan: {
    id: string;
    status: WeeklyPlanStatus;
    balanceScore: number;
    assignments: PlanAssignment[];
    durationDays?: number;
    createdAt: Date;
    appliedAt: Date | null;
    expiresAt: Date;
  } | null;
  aiEnabled: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

export function PlanStatusCard({ plan, aiEnabled }: PlanStatusCardProps) {
  if (!aiEnabled) {
    return null;
  }

  // No plan exists - show prompt to generate
  if (!plan) {
    return (
      <div className="rounded-2xl bg-primary/5 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-full bg-primary/10 p-2">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium">Genera un plan de distribución</p>
              <p className="truncate text-sm text-muted-foreground">
                Distribuye las tareas equitativamente entre los miembros
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="gap-2 shrink-0">
            <Link href="/plan">
              Generar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Pending plan - show banner to review
  if (plan.status === "PENDING") {
    const memberCount = new Set(plan.assignments.map((a) => a.memberName)).size;
    const taskCount = plan.assignments.length;

    return (
      <div className="rounded-2xl bg-amber-50 p-4 shadow-sm dark:bg-amber-950">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-900 p-2">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Plan pendiente de aprobación
                </p>
                <Badge variant="outline" className={cn("font-bold", getScoreColor(plan.balanceScore))}>
                  {plan.balanceScore}% equidad
                </Badge>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {taskCount} tareas para {memberCount} miembros
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="gap-2 shrink-0">
            <Link href="/plan">
              Revisar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Applied plan - show summary with link to details
  if (plan.status === "APPLIED") {
    const memberCount = new Set(plan.assignments.map((a) => a.memberName)).size;
    const taskCount = plan.assignments.length;

    return (
      <div className="rounded-2xl bg-green-50 p-4 shadow-sm dark:bg-green-950">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-full bg-green-100 dark:bg-green-900 p-2">
              <CheckCheck className="h-5 w-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-green-800 dark:text-green-200">
                  Plan aplicado
                </p>
                <Badge variant="outline" className={cn("font-bold", getScoreColor(plan.balanceScore))}>
                  {plan.balanceScore}% equidad
                </Badge>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Plan de {durationLabel(plan.durationDays ?? 7)} · {taskCount} tareas para {memberCount} miembros
                {plan.appliedAt && (
                  <> · {new Date(plan.appliedAt).toLocaleDateString("es", { day: "numeric", month: "short" })}</>
                )}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="ghost" className="gap-2 shrink-0 text-green-700 hover:text-green-800 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900">
            <Link href="/plan">
              Ver detalles
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Expired or rejected - show generate new prompt
  return (
    <div className="rounded-2xl bg-muted/30 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-full bg-muted p-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium">Tu plan anterior expiró</p>
            <p className="truncate text-sm text-muted-foreground">
              Genera un nuevo plan de distribución
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-2 shrink-0">
          <Link href="/plan">
            Nuevo plan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
