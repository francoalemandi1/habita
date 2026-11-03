import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Info, Tag, AlertTriangle, WifiOff } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

export type BannerTone = "info" | "offer" | "attention" | "offline";

export interface BannerProps {
  tone: BannerTone;
  text: string;
}

const ICONS = { info: Info, offer: Tag, attention: AlertTriangle, offline: WifiOff };

function getToneColors(c: ThemeColors): Record<BannerTone, { bg: string; text: string }> {
  return {
    info: { bg: c.paper, text: c.ink },
    offer: { bg: c.mantecaSoft, text: c.mantecaText },
    attention: { bg: c.ladrilloSoft, text: c.ladrilloText },
    offline: { bg: c.sand, text: c.ink2 },
  };
}

/** §6.18 Banner — inline, above content. One per screen; closes only when its cause clears. */
export function Banner({ tone, text }: BannerProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(), []);
  const toneColors = getToneColors(colors)[tone];
  const Icon = ICONS[tone];

  return (
    <View accessibilityRole="alert" style={[styles.base, { backgroundColor: toneColors.bg }]}>
      <Icon size={16} strokeWidth={1.75} color={toneColors.text} />
      <Text style={[styles.text, { color: toneColors.text }]}>{text}</Text>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderRadius: radius.control,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    text: {
      flex: 1,
      fontFamily: fontFamilyForWeight(400),
      fontSize: 14,
    },
  });
}
