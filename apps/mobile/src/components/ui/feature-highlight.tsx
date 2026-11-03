import type { ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius } from "@/theme";
import { palette } from "@habita/design-tokens";

import type { ThemeColors } from "@/theme";

interface FeatureHighlightProps {
  active: boolean;
  children: ReactNode;
  label?: string;
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    badge: {
      position: "absolute",
      top: -8,
      right: -4,
      backgroundColor: c.primary,
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 2,
      zIndex: 10,
      shadowColor: c.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 3,
    },
    badgeText: {
      fontFamily: fontFamily.sans,
      fontSize: 10,
      fontWeight: "700",
      color: palette.white,
    },
  });
}

export function FeatureHighlight({ active, children, label = "Nuevo" }: FeatureHighlightProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!active) return <>{children}</>;

  return (
    <View style={staticStyles.wrapper}>
      <View
        style={[
          staticStyles.highlightWrap,
          {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          },
        ]}
      >
        {children}
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{label}</Text>
      </View>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  highlightWrap: {
    borderRadius: 16,
  },
});
