export interface MoneyMember {
  id: string;
  name: string;
}

export interface MoneySplit {
  memberId: string;
  payerId: string;
  amount: number | string;
  currency: string;
}

export interface MoneySettlement {
  fromMemberId: string;
  toMemberId: string;
  amount: number | string;
  currency: string;
}

export interface MemberBalance {
  memberId: string;
  memberName: string;
  balance: number; // positive = owed to them, negative = they owe
}

export interface DebtTransaction {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
}

function toCents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

function centsToAmount(cents: number): number {
  return Math.round(cents) / 100;
}

interface BalanceAccumulator {
  name: string;
  cents: number;
}

function ensureMember(
  map: Map<string, BalanceAccumulator>,
  memberId: string,
  nameLookup: Map<string, string>,
): BalanceAccumulator {
  const existing = map.get(memberId);
  if (existing) return existing;
  const created: BalanceAccumulator = { name: nameLookup.get(memberId) ?? memberId, cents: 0 };
  map.set(memberId, created);
  return created;
}

function applySplits(
  balances: Map<string, BalanceAccumulator>,
  splits: MoneySplit[],
  nameLookup: Map<string, string>,
  currency: string,
): void {
  for (const split of splits) {
    if (split.currency !== currency || split.memberId === split.payerId) continue;
    const cents = toCents(split.amount);
    ensureMember(balances, split.payerId, nameLookup).cents += cents;
    ensureMember(balances, split.memberId, nameLookup).cents -= cents;
  }
}

function applySettlements(
  balances: Map<string, BalanceAccumulator>,
  settlements: MoneySettlement[],
  nameLookup: Map<string, string>,
  currency: string,
): void {
  for (const settlement of settlements) {
    if (settlement.currency !== currency) continue;
    const cents = toCents(settlement.amount);
    // Settling a debt reduces what the debtor owes (less negative) and
    // reduces what the payer is owed (less positive).
    ensureMember(balances, settlement.fromMemberId, nameLookup).cents += cents;
    ensureMember(balances, settlement.toMemberId, nameLookup).cents -= cents;
  }
}

function collectCurrencies(splits: MoneySplit[], settlements: MoneySettlement[]): string[] {
  const currencies = new Set<string>();
  for (const split of splits) currencies.add(split.currency);
  for (const settlement of settlements) currencies.add(settlement.currency);
  return Array.from(currencies);
}

/**
 * Compute net balances per currency: balance = Σ splits paid for others −
 * Σ splits owed − Σ settlements made + Σ settlements received.
 * Positive balance = others owe this member. Negative = this member owes others.
 */
export function computeBalancesByCurrency(params: {
  members: MoneyMember[];
  splits: MoneySplit[];
  settlements: MoneySettlement[];
}): Record<string, MemberBalance[]> {
  const { members, splits, settlements } = params;
  const nameLookup = new Map(members.map((member) => [member.id, member.name]));
  const result: Record<string, MemberBalance[]> = {};

  for (const currency of collectCurrencies(splits, settlements)) {
    const balances = new Map<string, BalanceAccumulator>();
    for (const member of members) ensureMember(balances, member.id, nameLookup);
    applySplits(balances, splits, nameLookup, currency);
    applySettlements(balances, settlements, nameLookup, currency);

    result[currency] = Array.from(balances.entries()).map(([memberId, data]) => ({
      memberId,
      memberName: data.name,
      balance: centsToAmount(data.cents),
    }));
  }

  return result;
}

interface DebtParty {
  memberId: string;
  memberName: string;
  cents: number;
}

function sortDebtParties(parties: DebtParty[]): void {
  parties.sort((a, b) => b.cents - a.cents || a.memberId.localeCompare(b.memberId));
}

/**
 * Simplify debts to the minimal number of transactions.
 * Greedy algorithm: match the largest creditor with the largest debtor,
 * breaking ties by amount desc then memberId for deterministic output.
 */
export function simplifyDebts(balances: MemberBalance[]): DebtTransaction[] {
  const creditors: DebtParty[] = [];
  const debtors: DebtParty[] = [];

  for (const balance of balances) {
    const cents = toCents(balance.balance);
    if (cents > 0) {
      creditors.push({ memberId: balance.memberId, memberName: balance.memberName, cents });
    } else if (cents < 0) {
      debtors.push({ memberId: balance.memberId, memberName: balance.memberName, cents: -cents });
    }
  }

  sortDebtParties(creditors);
  sortDebtParties(debtors);

  const transactions: DebtTransaction[] = [];
  let creditorIdx = 0;
  let debtorIdx = 0;

  while (creditorIdx < creditors.length && debtorIdx < debtors.length) {
    const creditor = creditors[creditorIdx];
    const debtor = debtors[debtorIdx];
    if (!creditor || !debtor) break;
    const transferCents = Math.min(creditor.cents, debtor.cents);

    if (transferCents > 0) {
      transactions.push({
        fromMemberId: debtor.memberId,
        fromMemberName: debtor.memberName,
        toMemberId: creditor.memberId,
        toMemberName: creditor.memberName,
        amount: centsToAmount(transferCents),
      });
    }

    creditor.cents -= transferCents;
    debtor.cents -= transferCents;

    if (creditor.cents === 0) creditorIdx++;
    if (debtor.cents === 0) debtorIdx++;
  }

  return transactions;
}
