import { splitEvenlyExact } from "@habita/domain";

/** §5.3 Global "Anotar" — pure helpers for the expense "Más opciones" section (web). */

const SPLIT_SUM_TOLERANCE = 0.01;

export interface CustomSplitSummary {
  assignedTotal: number;
  remaining: number;
  isBalanced: boolean;
  isOver: boolean;
}

/** How much of `amount` is still unassigned across a custom per-member split. */
export function summarizeCustomSplit(
  amount: number,
  customSplits: Record<string, string>,
  participantIds: string[],
): CustomSplitSummary {
  const assignedTotal = participantIds.reduce((sum, id) => sum + (parseFloat(customSplits[id] ?? "0") || 0), 0);
  const remaining = Math.round((amount - assignedTotal) * 100) / 100;
  return {
    assignedTotal,
    remaining,
    isBalanced: Math.abs(remaining) < SPLIT_SUM_TOLERANCE,
    isOver: remaining < -SPLIT_SUM_TOLERANCE,
  };
}

export type CustomSplitTone = "balanced" | "over" | "under";

/** Status line under the custom split: whether the amounts add up, and by how much they miss. */
export function describeCustomSplit(summary: CustomSplitSummary): { tone: CustomSplitTone; label: string } {
  if (summary.isBalanced) return { tone: "balanced", label: "Montos correctos" };
  const gap = Math.abs(summary.remaining).toLocaleString("es-AR", { maximumFractionDigits: 2 });
  if (summary.isOver) return { tone: "over", label: `$${gap} de más` };
  return { tone: "under", label: `$${gap} por asignar` };
}

export interface FundForVisibility {
  isActive: boolean;
  fundCategories: readonly string[];
}

/** The fund toggle only shows when the household fund is active and covers this category. */
export function isFundToggleVisible(fund: FundForVisibility | null | undefined, category: string): boolean {
  if (!fund?.isActive) return false;
  return fund.fundCategories.includes(category);
}

/**
 * `null` means the user hasn't touched the toggle yet — it follows the fund's
 * default (on, matching the old screen's auto-on behavior) as long as the
 * toggle is actually visible. An explicit `true`/`false` always wins, and the
 * toggle never resolves true when it isn't shown (no fund, inactive, or an
 * unmatched/unknown category — including while the fund is still loading).
 */
export function resolveChargeToFund(choice: boolean | null, isToggleVisible: boolean): boolean {
  if (!isToggleVisible) return false;
  return choice ?? true;
}

export interface ExpenseSplitDraft {
  amount: number;
  splitType: "EQUAL" | "CUSTOM";
  participantIds: string[];
  customSplits: Record<string, string>;
}

/** Builds the API's `splits` array for either split mode — CUSTOM honors the typed-in amounts exactly. */
export function buildExpenseSplits(draft: ExpenseSplitDraft): Array<{ memberId: string; amount: number }> {
  if (draft.splitType === "CUSTOM") {
    return draft.participantIds.map((memberId) => ({
      memberId,
      amount: parseFloat(draft.customSplits[memberId] ?? "0") || 0,
    }));
  }
  return splitEvenlyExact(draft.amount, draft.participantIds);
}
