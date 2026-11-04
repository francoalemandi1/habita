import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight } from "@/theme";
import type { ThemeColors } from "@/theme";
import { formatCurrencyArs, transactionRowLabel } from "@/lib/plata-money-saldos";
import { lockedByLabel } from "@/lib/plata-money-settle";

import type { SettleTransferRow } from "@/lib/plata-money-settle";

interface SettleTransferRowViewProps {
  row: SettleTransferRow;
  currentMemberId: string;
  primaryCurrency: string;
}

export function SettleTransferRowView({
  row,
  currentMemberId,
  primaryCurrency,
}: SettleTransferRowViewProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { transaction, currency, recordable } = row;

  return (
    <View style={styles.row}>
      <Text style={styles.title}>{transactionRowLabel(transaction, currentMemberId)}</Text>
      <View style={styles.trailing}>
        <Text style={styles.amount}>
          {formatCurrencyArs(transaction.amount)}
          {currency !== primaryCurrency ? ` ${currency}` : ""}
        </Text>
        {!recordable && <Text style={styles.locked}>{lockedByLabel(transaction)}</Text>}
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.lineSoft,
    },
    title: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ink,
      flex: 1,
    },
    trailing: {
      alignItems: "flex-end",
    },
    amount: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      fontVariant: ["tabular-nums"],
      color: c.ink,
    },
    locked: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 12,
      color: c.ink3,
    },
  });
}
