import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ListRow } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import type { ThemeColors } from "@/theme";
import { formatCurrencyArs, transactionRowLabel } from "@/lib/plata-money-saldos";
import { sectionLabelStyle } from "@/lib/plata-money-ui";

import type { ExpenseBalancesResponse } from "@habita/contracts";

interface TransactionsListProps {
  balances: ExpenseBalancesResponse;
  currentMemberId: string;
}

/** "Entre ustedes" — the minimal simplified transactions, across every currency. */
export function TransactionsList({ balances, currentMemberId }: TransactionsListProps): React.JSX.Element | null {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const rows = Object.entries(balances.byCurrency).flatMap(([currency, { transactions }]) =>
    transactions.map((transaction) => ({ transaction, currency })),
  );

  if (rows.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Entre ustedes</Text>
      <View>
        {rows.map(({ transaction, currency }) => (
          <ListRow
            key={`${currency}-${transaction.fromMemberId}-${transaction.toMemberId}`}
            title={transactionRowLabel(transaction, currentMemberId)}
            trailingAmount={`${formatCurrencyArs(transaction.amount)}${
              currency !== balances.primaryCurrency ? ` ${currency}` : ""
            }`}
          />
        ))}
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 8,
    },
    label: sectionLabelStyle(c),
  });
}
