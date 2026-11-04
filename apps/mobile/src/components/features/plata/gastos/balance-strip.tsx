import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@habita/contracts";
import { Button } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { SettleUpSheet } from "@/components/features/plata/settle-up-sheet";

import type { ThemeColors } from "@/theme";
import type { MyBalanceSummary } from "@habita/domain";
import type { PlataViewProps } from "@/components/features/plata/plata-view-props";

interface BalanceStripProps extends PlataViewProps {
  balance: MyBalanceSummary;
}

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

/** Balance strip + Liquidar entry (handoff §5.3 "Plata" — Gastos). */
export function BalanceStrip({ balance, currentMemberId, currentMemberType, members }: BalanceStripProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const [settleOpen, setSettleOpen] = useState(false);

  return (
    <View style={styles.strip}>
      {balance.isSettled ? (
        <Text style={styles.settledText}>Están al día</Text>
      ) : (
        <View style={styles.tilesRow}>
          {balance.owedToMe ? (
            <Text style={styles.line}>
              {balance.owedToMe.memberName} te debe{" "}
              <Text style={[styles.amount, { color: colors.monte }]}>{formatArs(balance.owedToMe.amount)}</Text>
            </Text>
          ) : null}
          {balance.iOwe ? (
            <Text style={styles.line}>
              Le debés a {balance.iOwe.memberName}{" "}
              <Text style={[styles.amount, { color: colors.ladrilloText }]}>{formatArs(balance.iOwe.amount)}</Text>
            </Text>
          ) : null}
        </View>
      )}

      {!balance.isSettled ? (
        <Button label="Liquidar" variant="secondary" size="sm" onPress={() => setSettleOpen(true)} />
      ) : null}

      <SettleUpSheet
        visible={settleOpen}
        onClose={() => {
          setSettleOpen(false);
          void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.balances() });
          void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.list() });
        }}
        currentMemberId={currentMemberId}
        currentMemberType={currentMemberType}
        members={members}
      />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    strip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.tile,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
    },
    tilesRow: {
      flex: 1,
      gap: 2,
    },
    line: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink,
    },
    amount: {
      fontFamily: fontFamilyForWeight(500),
      fontVariant: ["tabular-nums"],
    },
    settledText: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink2,
    },
  });
}
