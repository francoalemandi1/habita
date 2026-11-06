"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ds/dialog";
import { Avatar } from "@/components/ds/avatar";
import { EmptyState } from "@/components/ds/empty-state";
import { useWeeklyPlan } from "@/hooks/use-weekly-plan";
import { useTareasTasks } from "@/hooks/use-tareas-tasks";
import { getWeekMonday, getWeekSunday, formatWeekRange } from "@/lib/calendar-utils";
import { TAREAS_ROUTES, APP_ROUTES } from "@habita/contracts";

/** Plan semanal — generate, preview per-person, confirm and apply with a staggered entrance (handoff §7 "Aplicar plan"). */
export function PlanView(): React.JSX.Element {
  const weeklyPlan = useWeeklyPlan();
  const { data: tasksData } = useTareasTasks();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const monday = useMemo(() => getWeekMonday(new Date()), []);
  const sunday = useMemo(() => getWeekSunday(monday), [monday]);
  const { generate } = weeklyPlan;
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Guards StrictMode's dev double-mount — re-generation afterwards is explicit via "Otra".
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    generate(monday, sunday);
  }, [generate, monday, sunday]);

  const minutesByTaskName = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasksData?.tasks ?? []) {
      if (task.estimatedMinutes) map.set(task.name, task.estimatedMinutes);
    }
    return map;
  }, [tasksData]);

  if (weeklyPlan.isGenerating) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Loader2 className="size-6 animate-spin text-ink-2" />
        <p className="text-[15px] text-ink-2">Armando el plan de la semana…</p>
      </div>
    );
  }

  if (weeklyPlan.previewFailed || !weeklyPlan.plan) {
    return (
      <div className="flex flex-col gap-4 rounded-[20px] bg-manteca-soft p-6 text-center">
        <p className="text-[22px] font-bold text-ink">Hoy no podemos armar el plan automático</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href={TAREAS_ROUTES.rotations} className="h-11 rounded-[12px] bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink">
            Repartir con rotaciones
          </Link>
          <Link href={`${APP_ROUTES.tareas}?v=lista`} className="h-11 rounded-[12px] bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink">
            Asignar a mano
          </Link>
        </div>
      </div>
    );
  }

  const { plan } = weeklyPlan;
  const byMember = new Map<string, typeof plan.assignments>();
  for (const assignment of plan.assignments) {
    byMember.set(assignment.memberName, [...(byMember.get(assignment.memberName) ?? []), assignment]);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-ink">Plan de la semana</h1>
        <p className="text-[14px] text-ink-2">
          {formatWeekRange(new Date(plan.startDate))} · {plan.assignments.length} tareas
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {Array.from(byMember.entries()).map(([memberName, assignments]) => {
          const totalMinutes = assignments.reduce((sum, a) => sum + (minutesByTaskName.get(a.taskName) ?? 0), 0);
          return (
            <div key={memberName} className="rounded-[16px] bg-surface p-4">
              <div className="mb-2 flex items-center gap-2">
                <Avatar name={memberName} size={28} />
                <span className="text-[15px] font-semibold text-ink">{memberName}</span>
                {totalMinutes > 0 && <span className="text-[13px] text-ink-2">· {totalMinutes} min</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {assignments.map((a) => (
                  <span key={a.taskName} className="rounded-full bg-sand px-2.5 py-1 text-[12px] text-ink">
                    {a.taskName}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {plan.notes.length > 0 && (
        <div className="rounded-[16px] bg-sand p-4">
          <p className="mb-1 text-[12px] font-semibold uppercase tracking-[.06em] text-ink-2">Por qué</p>
          {plan.notes.map((note, index) => (
            <p key={index} className="text-[13px] text-ink-2">
              {note}
            </p>
          ))}
        </div>
      )}

      {weeklyPlan.applied ? (
        <div className="rounded-[16px] bg-monte-soft p-4">
          <p className="mb-2 text-[14px] font-semibold text-ink">Plan aplicado</p>
          <div className="flex flex-col gap-1">
            {plan.assignments.map((a, index) => (
              <p
                key={`${a.taskName}|${a.memberId}`}
                className="animate-[fade-in_260ms_ease-out] text-[13px] text-ink-2"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {a.taskName} → {a.memberName}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => weeklyPlan.generate(monday, sunday)}
            className="h-11 flex-1 rounded-[12px] bg-sand text-[15px] font-semibold text-ink"
          >
            Otra
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-monte text-[15px] font-semibold text-paper"
          >
            <Sparkles className="size-4" strokeWidth={1.75} />
            Aplicar plan
          </button>
        </div>
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Aplicar plan"
        body={`Se van a crear ${plan.assignments.length} tareas asignadas. Podés seguir ajustando después desde Semana o Lista.`}
        confirmLabel="Aplicar"
        confirmTone="primary"
        onConfirm={() => {
          setConfirmOpen(false);
          weeklyPlan.apply();
        }}
      />

      {weeklyPlan.isApplying && (
        <EmptyState icon={Loader2} title="Aplicando…" description="Creando las asignaciones." />
      )}
    </div>
  );
}
