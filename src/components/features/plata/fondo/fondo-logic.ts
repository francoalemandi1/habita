import type { MemberContributionStatus } from "@habita/contracts";

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "2026-11" → "noviembre". */
export function monthLabelEs(period: string): string {
  const [, month] = period.split("-");
  const index = Number(month) - 1;
  return MONTHS_ES[index] ?? period;
}

/** "Pendiente" / "Aportada" quota status for the current member. */
export function quotaStatusLabel(status: MemberContributionStatus | undefined): "Pendiente" | "Aportada" {
  return (status?.pending ?? 0) > 0 ? "Pendiente" : "Aportada";
}

/** Suggested contribution: the member's pending quota for the current period, editable in the sheet. */
export function suggestedContributionAmount(status: MemberContributionStatus | undefined): number {
  return status?.pending ?? 0;
}

/** Validates the editable amount entered in the Aportar sheet. */
export function isValidContributionAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}
