import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

export interface ListRowProps {
  icon?: LucideIcon;
  leading?: React.ReactNode;
  title: string;
  meta?: string;
  trailingAmount?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}

/** §6.11 ListRow — min 60 height, 36 icon square or avatar leading, tabular trailing amount. */
export function ListRow({ icon: Icon, leading, title, meta, trailingAmount, trailing, onPress }: ListRowProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const content = (
    <View style={styles.row}>
      {leading ?? (Icon ? (
        <View style={styles.iconBox}>
          <Icon size={18} strokeWidth={1.75} color={colors.ink} />
        </View>
      ) : null)}
      <View style={styles.textColumn}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
      </View>
      {trailingAmount ? <Text style={styles.amount}>{trailingAmount}</Text> : trailing}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      {content}
    </Pressable>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 60,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "#EEE8DD",
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: radius.rowIcon,
      backgroundColor: c.paper,
      alignItems: "center",
      justifyContent: "center",
    },
    textColumn: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ink,
    },
    meta: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
    amount: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ink,
    },
  });
}
