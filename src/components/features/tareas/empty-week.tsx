import Link from "next/link";
import { TAREAS_ROUTES } from "@habita/contracts";
import { buttonVariants } from "@/components/ds/lib/button-variants";
import { cn } from "@/lib/utils";

interface EmptyWeekProps {
  /** Past/future weeks only explain; the current week offers to plan it. */
  isCurrentWeek?: boolean;
  className?: string;
}

/** Empty week (§6.21): one line of why, and the way out — plan it or add tasks. */
export function EmptyWeek({ isCurrentWeek = true, className }: EmptyWeekProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-col items-start gap-3", className)}>
      <p className="text-[17px] font-semibold text-ink">
        {isCurrentWeek ? "Esta semana no hay tareas" : "No hay tareas en esta semana"}
      </p>
      {isCurrentWeek && (
        <>
          <p className="max-w-sm text-[14px] text-ink-2">
            Armá el plan y Habita reparte las tareas según la disponibilidad de cada uno.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link href={TAREAS_ROUTES.plan} className={buttonVariants({ variant: "ink", size: "sm" })}>
              Armar el plan
            </Link>
            <Link href={TAREAS_ROUTES.add} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Sumar tareas
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
