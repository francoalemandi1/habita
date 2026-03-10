import Link from "next/link";

export type HeroPriority = "today" | "transfers" | "balance-owed" | "balance-owing" | "all-clear";

export interface HeroState {
  priority: HeroPriority;
  headline: string;
  label: string;
  ctaLabel: string;
  ctaRoute: string;
}

interface DashboardHeroCardProps {
  state: HeroState;
}

const TODAY_HEADLINES = [
  "¡A darle! 💪",
  "¡Manos a la obra! 🙌",
  "¡Vamos que se puede! 🚀",
  "Tu día te espera ☀️",
  "¡Dale que va! 💥",
  "¡Arrancamos! 🔥",
];

const ALL_CLEAR_HEADLINES = [
  "Todo al día ✨",
  "¡Impecable! ✨",
  "Nada pendiente 🎉",
];

function pickByHour(options: string[]): string {
  const hour = new Date().getHours();
  return options[hour % options.length] ?? options[0] ?? "";
}

function getColorClasses(priority: HeroPriority) {
  switch (priority) {
    case "transfers":
      return { bg: "bg-amber-50 dark:bg-amber-950/30", accent: "text-amber-700 dark:text-amber-400", btn: "bg-amber-600 text-white hover:bg-amber-700" };
    default:
      return { bg: "bg-primary/[0.06] dark:bg-primary/[0.10]", accent: "text-primary", btn: "bg-primary text-white hover:bg-primary/90" };
  }
}

export function computeHeroState(input: {
  todayTaskCount: number;
  pendingTransferCount: number;
  expenseBalance: number;
}): HeroState {
  if (input.todayTaskCount > 0) {
    return {
      priority: "today",
      headline: pickByHour(TODAY_HEADLINES),
      label: input.todayTaskCount === 1
        ? "Tenés 1 tarea para hoy"
        : `Tenés ${input.todayTaskCount} tareas para hoy`,
      ctaLabel: "Ir a mis tareas",
      ctaRoute: "/tasks",
    };
  }

  if (input.pendingTransferCount > 0) {
    return {
      priority: "transfers",
      headline: input.pendingTransferCount === 1
        ? "1 transferencia"
        : `${input.pendingTransferCount} transferencias`,
      label: "pendientes de aceptar",
      ctaLabel: "Ver transferencias",
      ctaRoute: "/tasks",
    };
  }

  if (input.expenseBalance > 0) {
    return {
      priority: "balance-owed",
      headline: `+$${input.expenseBalance.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`,
      label: "te deben",
      ctaLabel: "Ver balance",
      ctaRoute: "/balance",
    };
  }

  if (input.expenseBalance < 0) {
    return {
      priority: "balance-owing",
      headline: `$${Math.abs(input.expenseBalance).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`,
      label: "debés",
      ctaLabel: "Ver balance",
      ctaRoute: "/balance",
    };
  }

  return {
    priority: "all-clear",
    headline: pickByHour(ALL_CLEAR_HEADLINES),
    label: "No tenés pendientes. ¡Disfrutá el día!",
    ctaLabel: "Ver ofertas",
    ctaRoute: "/compras",
  };
}

export function DashboardHeroCard({ state }: DashboardHeroCardProps) {
  const colors = getColorClasses(state.priority);
  const showButton = state.priority !== "all-clear";

  return (
    <Link
      href={state.ctaRoute}
      className={`block rounded-2xl px-5 py-4 transition-all hover:shadow-md active:scale-[0.99] ${colors.bg} animate-fade-in`}
    >
      <p className={`font-handwritten text-2xl ${colors.accent}`}>
        {state.headline}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">
        {state.label}
      </p>
      {showButton ? (
        <span className={`mt-3 inline-block rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${colors.btn}`}>
          {state.ctaLabel}
        </span>
      ) : (
        <span className={`mt-3 inline-block text-sm font-semibold ${colors.accent}`}>
          {state.ctaLabel}
        </span>
      )}
    </Link>
  );
}
