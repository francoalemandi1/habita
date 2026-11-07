import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight } from "@/theme";
import type { ThemeColors } from "@/theme";
import { findMemberNet, netStatus } from "@/lib/plata-money-saldos";

import type { ExpenseBalancesResponse } from "@habita/contracts";

interface BalanceHeroProps {
  balances: ExpenseBalancesResponse;
  currentMemberId: string;
}

/** Net balance in the primary currency, Monte if positive, Ladrillo texto if negative. */
export function BalanceHero({ balances, currentMemberId }: BalanceHeroProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const primaryNet = findMemberNet(balances.balances, currentMemberId);
  const status = netStatus(primaryNet);
  const toneColor =
    status.sign === "positive" ? colors.monte : status.sign === "negative" ? colors.ladrilloText : colors.ink;

  const otherCurrencies = Object.entries(balances.byCurrency).filter(
    ([currency]) => currency !== balances.primaryCurrency,
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.net, { color: toneColor }]}>{status.label}</Text>
      {otherCurrencies.map(([currency, { balances: currencyBalances }]) => {
        const net = findMemberNet(currencyBalances, currentMemberId);
        return (
          <Text key={currency} style={styles.otherCurrency}>
            {netStatus(net).label} {currency}
          </Text>
        );
      })}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 4,
    },
    net: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 56,
      lineHeight: 56 * 0.95,
      letterSpacing: -56 * 0.04,
      fontVariant: ["tabular-nums"],
    },
    otherCurrency: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink2,
    },
  });
}
