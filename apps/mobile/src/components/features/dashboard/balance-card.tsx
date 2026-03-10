import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Wallet } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

interface BalanceCardProps {
  balance: number;
}

export function BalanceCard({ balance }: BalanceCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (balance === 0) return null;

  const isPositive = balance > 0;
  const formatted = `$${Math.abs(balance).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
  const label = isPositive ? "Te deben" : "Debés";
  const accentColor = isPositive ? colors.successText : colors.errorText;
  const bgColor = isPositive ? colors.successBg : colors.errorBg;

  return (
    <Pressable
      onPress={() => router.push("/(app)/balance" as never)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: bgColor },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accentColor }]}>
        <Wallet size={16} color={colors.white} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.amount, { color: accentColor }]}>{formatted}</Text>
      </View>
      <ChevronRight size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
      borderRadius: radius.xl,
    },
    pressed: {
      opacity: 0.7,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    textWrap: {
      flex: 1,
      gap: 1,
    },
    label: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "500",
    },
    amount: {
      fontFamily: fontFamily.sans,
      fontSize: 17,
      fontWeight: "700",
    },
  });
}
