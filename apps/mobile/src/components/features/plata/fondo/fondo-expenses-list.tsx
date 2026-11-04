import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ListRow } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import type { ThemeColors } from "@/theme";
import { formatCurrencyArs } from "@/lib/plata-money-saldos";
import { sectionLabelStyle } from "@/lib/plata-money-ui";

import type { SerializedFundExpense } from "@habita/contracts";

interface FondoExpensesListProps {
  expenses: SerializedFundExpense[];
}

/** Recent expenses paid from the shared fund. */
export function FondoExpensesList({ expenses }: FondoExpensesListProps): React.JSX.Element | null {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (expenses.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Gastos del fondo</Text>
      <View>
        {expenses.map((expense) => (
          <ListRow
            key={expense.id}
            title={expense.title}
            meta={new Date(expense.date).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
            trailingAmount={formatCurrencyArs(expense.amount)}
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
