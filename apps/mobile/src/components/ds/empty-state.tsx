import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight } from "@/theme";
import type { ThemeColors } from "@/theme";
import { spacing } from "@habita/design-tokens";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** §6.21 EmptyState — title, one line of explanation, a single primary action. */
export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {Icon ? <Icon size={32} strokeWidth={1.75} color={colors.ink3} /> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.xxxl,
      paddingHorizontal: spacing.xl,
    },
    title: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 28,
      fontWeight: "700",
      color: c.ink,
      textAlign: "center",
    },
    description: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink2,
      textAlign: "center",
    },
  });
}
