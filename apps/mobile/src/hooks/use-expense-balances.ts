import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";
import { queryKeys } from "@habita/contracts";

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

interface BalancesData {
  balances: MemberBalance[];
  transactions: DebtTransaction[];
}


export function useExpenseBalances() {
  return useQuery({
    queryKey: queryKeys.expenses.balances(),
    queryFn: async () => mobileApi.get<BalancesData>("/api/expenses/balances"),
  });
}

export function useSettleDebts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { fromMemberId: string; toMemberId: string }) =>
      mobileApi.post<{ settledCount: number; totalAmount: number }>(
        "/api/expenses/settle-between",
        input,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.expenses.balances() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() });
    },
  });
}
