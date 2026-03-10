import { useMemo } from "react";

import type { AssignmentSummary } from "@habita/contracts";
import type { HeroState } from "./types";

interface TransferItem {
  id: string;
  status: string;
}

interface UseHeroStateInput {
  pendingAssignments: AssignmentSummary[];
  incomingTransfers: TransferItem[];
  myBalance: number;
  isLoading: boolean;
}

// Motivational headlines that rotate by hour
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

export function useHeroState({
  pendingAssignments,
  incomingTransfers,
  myBalance,
  isLoading,
}: UseHeroStateInput): { state: HeroState; loading: boolean } {
  return useMemo(() => {
    if (isLoading) {
      return {
        state: {
          priority: "all-clear" as const,
          headline: "",
          label: "",
          ctaLabel: "",
          ctaRoute: "/(app)/tasks",
        },
        loading: true,
      };
    }

    const todayStr = new Date().toDateString();

    // 1. Tasks due today
    const todayTasks = pendingAssignments.filter(
      (a) => new Date(a.dueDate).toDateString() === todayStr,
    );

    if (todayTasks.length > 0) {
      return {
        state: {
          priority: "today" as const,
          headline: pickByHour(TODAY_HEADLINES),
          label:
            todayTasks.length === 1
              ? "Tenés 1 tarea para hoy"
              : `Tenés ${todayTasks.length} tareas para hoy`,
          ctaLabel: "Ir a mis tareas",
          ctaRoute: "/(app)/tasks",
        },
        loading: false,
      };
    }

    // 2. Pending incoming transfers
    if (incomingTransfers.length > 0) {
      return {
        state: {
          priority: "transfers" as const,
          headline:
            incomingTransfers.length === 1
              ? "1 transferencia"
              : `${incomingTransfers.length} transferencias`,
          label: "pendientes de aceptar",
          ctaLabel: "Ver transferencias",
          ctaRoute: "/(app)/transfers",
        },
        loading: false,
      };
    }

    // 3. Balance — others owe me
    if (myBalance > 0) {
      return {
        state: {
          priority: "balance-owed" as const,
          headline: `+$${myBalance.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`,
          label: "te deben",
          ctaLabel: "Ver balance",
          ctaRoute: "/(app)/balance",
        },
        loading: false,
      };
    }

    // 4. Balance — I owe others
    if (myBalance < 0) {
      return {
        state: {
          priority: "balance-owing" as const,
          headline: `$${Math.abs(myBalance).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`,
          label: "debés",
          ctaLabel: "Ver balance",
          ctaRoute: "/(app)/balance",
        },
        loading: false,
      };
    }

    // 5. All clear
    return {
      state: {
        priority: "all-clear" as const,
        headline: pickByHour(ALL_CLEAR_HEADLINES),
        label: "No tenés pendientes. ¡Disfrutá el día!",
        ctaLabel: "Ver ofertas",
        ctaRoute: "/(app)/compras",
      },
      loading: false,
    };
  }, [pendingAssignments, incomingTransfers, myBalance, isLoading]);
}
