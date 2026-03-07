import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Lightbulb } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

interface BriefingTipProps {
  text: string;
}

export function BriefingTip({ text }: BriefingTipProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Lightbulb size={16} color={colors.warningText} style={styles.icon} />
      <Text style={styles.text} numberOfLines={3}>
        {text}
      </Text>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      backgroundColor: c.warningBg,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    icon: {
      flexShrink: 0,
      marginTop: 1,
    },
    text: {
      flex: 1,
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "500",
      color: c.warningText,
      lineHeight: 18,
    },
  });
}
