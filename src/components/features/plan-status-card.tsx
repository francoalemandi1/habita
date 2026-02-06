"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Genera un plan de distribución</p>
              <p className="text-sm text-muted-foreground">
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
        </CardContent>
      </Card>
    );
  }

  // Pending plan - show banner to review
  if (plan.status === "PENDING") {
    const memberCount = new Set(plan.assignments.map((a) => a.memberName)).size;
    const taskCount = plan.assignments.length;

    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900 p-2">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
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
          <Button asChild size="sm" variant="outline" className="gap-2 shrink-0 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900">
            <Link href="/plan">
              Revisar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Applied plan - show summary with link to details
  if (plan.status === "APPLIED") {
    const memberCount = new Set(plan.assignments.map((a) => a.memberName)).size;
    const taskCount = plan.assignments.length;

    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
              <CheckCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
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
        </CardContent>
      </Card>
    );
  }

  // Expired or rejected - show generate new prompt
  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted p-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Tu plan anterior expiró</p>
            <p className="text-sm text-muted-foreground">
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
      </CardContent>
    </Card>
  );
}
