import type { ExpenseCategory, SplitType } from "@prisma/client";

export interface ExpenseSplitSerialized {
  id: string;
  memberId: string;
  amount: number;
  settled: boolean;
  member: { id: string; name: string };
}

export interface SerializedExpense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  splitType: SplitType;
  date: string;
  notes: string | null;
  paidBy: { id: string; name: string };
  splits: ExpenseSplitSerialized[];
}

export interface MemberBalance {
  memberId: string;
  memberName: string;
  balance: number;
}

export interface DebtTransaction {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
}

export interface MemberOption {
  id: string;
  name: string;
}
