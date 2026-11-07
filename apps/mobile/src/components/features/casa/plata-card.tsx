import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

import type { ThemeColors } from "@/theme";
import type { MyBalanceSummary } from "@habita/domain";

export interface PlataCardProps {
  monthLabel: string;
  monthTotal: number;
  balance: MyBalanceSummary;
}

function formatAmount(value: number): string {
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}

/** Casa "Plata" card (§5.3): month total + my balance tiles. */
export function PlataCard({ monthLabel, monthTotal, balance }: PlataCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ver Plata"
      onPress={() => router.push("/(app)/plata")}
      style={styles.card}
    >
      <Text style={styles.monthLabel}>{`${monthLabel} · ${formatAmount(monthTotal)}`}</Text>

      {balance.isSettled ? (
        <Text style={styles.settled}>Están al día</Text>
      ) : (
        <View style={styles.tiles}>
          {balance.owedToMe ? (
            <View style={[styles.tile, { backgroundColor: colors.monteSoft }]}>
              <Text style={[styles.tileText, { color: colors.monte }]} numberOfLines={2}>
                {`${balance.owedToMe.memberName} te debe ${formatAmount(balance.owedToMe.amount)}`}
              </Text>
            </View>
          ) : null}
          {balance.iOwe ? (
            <View style={[styles.tile, { backgroundColor: colors.ladrilloSoft }]}>
              <Text style={[styles.tileText, { color: colors.ladrilloText }]} numberOfLines={2}>
                {`Le debés a ${balance.iOwe.memberName} ${formatAmount(balance.iOwe.amount)}`}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.card,
      padding: spacing.xl,
      gap: spacing.md,
    },
    monthLabel: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 22,
      color: c.ink,
      fontVariant: ["tabular-nums"],
    },
    settled: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.monte,
    },
    tiles: {
      gap: spacing.sm,
    },
    tile: {
      borderRadius: radius.tile,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    tileText: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 14,
    },
  });
}
