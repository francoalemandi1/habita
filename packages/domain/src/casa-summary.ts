/**
 * Pure summaries behind the Casa board (handoff §5.3 "Casa"), shared by the
 * web server component and the mobile screen so both read the same numbers.
 */

const DONE_STATUSES: ReadonlySet<string> = new Set(["COMPLETED", "VERIFIED"]);
const COUNTED_STATUSES_EXCLUDED: ReadonlySet<string> = new Set(["CANCELLED"]);
/** Difference in completed tasks still read as an even split. */
const EVEN_SPLIT_TOLERANCE = 1;

const WEEKDAY_LABELS = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"] as const;
const MONTH_LABELS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"] as const;

export interface CasaAssignment {
  memberId: string;
  status: string;
}

export interface CasaMember {
  id: string;
  name: string;
}

export interface MemberTaskShare {
  memberId: string;
  name: string;
  done: number;
}

export interface WeekTasksSummary {
  done: number;
  total: number;
  /** Current member first, then the rest in the given member order. */
  shares: MemberTaskShare[];
  remaining: number;
  isEven: boolean;
}

export function summarizeWeekTasks(input: {
  assignments: readonly CasaAssignment[];
  members: readonly CasaMember[];
  currentMemberId: string;
}): WeekTasksSummary {
  const counted = input.assignments.filter((assignment) => !COUNTED_STATUSES_EXCLUDED.has(assignment.status));
  const doneByMember = new Map<string, number>();
  for (const assignment of counted) {
    if (!DONE_STATUSES.has(assignment.status)) continue;
    doneByMember.set(assignment.memberId, (doneByMember.get(assignment.memberId) ?? 0) + 1);
  }

  const orderedMembers = [
    ...input.members.filter((member) => member.id === input.currentMemberId),
    ...input.members.filter((member) => member.id !== input.currentMemberId),
  ];
  const shares = orderedMembers.map((member) => ({
    memberId: member.id,
    name: member.name,
    done: doneByMember.get(member.id) ?? 0,
  }));
  const done = shares.reduce((sum, share) => sum + share.done, 0);
  const doneCounts = shares.map((share) => share.done);
  const spread = doneCounts.length > 0 ? Math.max(...doneCounts) - Math.min(...doneCounts) : 0;

  return {
    done,
    total: counted.length,
    shares,
    remaining: Math.max(counted.length - done, 0),
    isEven: spread <= EVEN_SPLIT_TOLERANCE,
  };
}

export interface CasaDebt {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
}

export interface BalanceTile {
  memberName: string;
  amount: number;
}

export interface MyBalanceSummary {
  /** Largest amount someone owes the current member, if any. */
  owedToMe: BalanceTile | null;
  /** Largest amount the current member owes someone, if any. */
  iOwe: BalanceTile | null;
  isSettled: boolean;
}

function largest(tiles: BalanceTile[]): BalanceTile | null {
  return tiles.reduce<BalanceTile | null>((top, tile) => (top && top.amount >= tile.amount ? top : tile), null);
}

export function summarizeMyBalance(transactions: readonly CasaDebt[], currentMemberId: string): MyBalanceSummary {
  const owedToMe = transactions
    .filter((debt) => debt.toMemberId === currentMemberId && debt.amount > 0)
    .map((debt) => ({ memberName: debt.fromMemberName, amount: debt.amount }));
  const iOwe = transactions
    .filter((debt) => debt.fromMemberId === currentMemberId && debt.amount > 0)
    .map((debt) => ({ memberName: debt.toMemberName, amount: debt.amount }));
  return {
    owedToMe: largest(owedToMe),
    iOwe: largest(iOwe),
    isSettled: owedToMe.length === 0 && iOwe.length === 0,
  };
}

/** L1 date label, e.g. "MARTES 3 NOV". Uses the date's local calendar day. */
export function formatCasaDateLabel(date: Date): string {
  return `${WEEKDAY_LABELS[date.getDay()]} ${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`;
}
