const arsFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export interface RecordedSettlement {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
  fromMember: { name: string };
  toMember: { name: string };
}

export interface SettlementNotice {
  memberId: string;
  message: string;
}

function formatMoney(amount: number, currency: string): string {
  const formatted = arsFormatter.format(amount);
  return currency === "ARS" ? `$${formatted}` : `${currency} ${formatted}`;
}

/**
 * Tells each party of a recorded payment about it, except the person who
 * recorded it: the receiver hears "X te pagó", and a payer whose payment an
 * adult recorded hears who registered it.
 */
export function buildSettlementNotices(
  settlements: RecordedSettlement[],
  recorder: { id: string; name: string },
): SettlementNotice[] {
  return settlements.flatMap((settlement) => {
    const amount = formatMoney(settlement.amount, settlement.currency);
    const notices: SettlementNotice[] = [];
    if (settlement.toMemberId !== recorder.id) {
      notices.push({ memberId: settlement.toMemberId, message: `${settlement.fromMember.name} te pagó ${amount}` });
    }
    if (settlement.fromMemberId !== recorder.id) {
      notices.push({
        memberId: settlement.fromMemberId,
        message: `${recorder.name} registró tu pago de ${amount} a ${settlement.toMember.name}`,
      });
    }
    return notices;
  });
}
