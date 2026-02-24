/**
 * Household mode utilities.
 *
 * The "solo" vs "shared" mode is derived from member count — never stored.
 * When a second member joins, the mode switches automatically.
 */

export function isSoloHousehold(memberCount: number): boolean {
  return memberCount === 1;
}

interface HouseholdCopy {
  /** Plan status card — no plan state */
  planPromptTitle: string;
  planPromptSubtitle: string;
  /** Plan status card — active/pending plan */
  planMembersSummary: (taskCount: number, memberCount: number) => string;
  /** Whether to show the equity badge on plan cards */
  showEquityBadge: boolean;
  /** Empty assignments list */
  emptyAssignmentsTitle: string;
  emptyAssignmentsText: string;
  /** Balance card on dashboard */
  balanceEmpty: string;
  balanceSubtitle: string;
  /** Invite card */
  inviteCardTitle: string;
  inviteCardSubtitle: string;
  /** Plan generation loading messages */
  loadingMessages: string[];
}

const SOLO_COPY: HouseholdCopy = {
  planPromptTitle: "Genera tu plan semanal",
  planPromptSubtitle: "Organiza tus tareas de la semana",
  planMembersSummary: (taskCount) => `${taskCount} tareas para esta semana`,
  showEquityBadge: false,
  emptyAssignmentsTitle: "Empezá a organizar tu hogar",
  emptyAssignmentsText:
    "Generá un plan de tareas y Habita organiza tu semana.",
  balanceEmpty: "Registrá tu primer gasto",
  balanceSubtitle: "Llevá el control de tus gastos del hogar",
  inviteCardTitle: "¿Compartís tu hogar?",
  inviteCardSubtitle: "Invitá a alguien a unirse",
  loadingMessages: [
    "Organizando tus tareas...",
    "Creando tu plan personalizado...",
    "Casi listo...",
  ],
};

const SHARED_COPY: HouseholdCopy = {
  planPromptTitle: "Genera un plan de distribución",
  planPromptSubtitle:
    "Distribuye las tareas equitativamente entre los miembros",
  planMembersSummary: (taskCount, memberCount) =>
    `${taskCount} tareas para ${memberCount} ${memberCount === 1 ? "miembro" : "miembros"}`,
  showEquityBadge: true,
  emptyAssignmentsTitle: "Empezá a organizar tu hogar",
  emptyAssignmentsText:
    "Generá un plan de tareas y Habita las reparte entre los miembros del hogar.",
  balanceEmpty: "Registrá tu primer gasto compartido",
  balanceSubtitle: "Llevá las cuentas claras con tu hogar",
  inviteCardTitle: "¡Invitá a los miembros de tu hogar!",
  inviteCardSubtitle: "Compartí el código para que se unan",
  loadingMessages: [
    "Distribuyendo tareas equitativamente...",
    "Balanceando cargas de trabajo...",
    "Creando tu calendario de tareas...",
    "Casi listo...",
  ],
};

export function getHouseholdCopy(isSolo: boolean): HouseholdCopy {
  return isSolo ? SOLO_COPY : SHARED_COPY;
}
