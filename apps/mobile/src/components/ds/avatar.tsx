import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight } from "@/theme";
import type { ThemeColors } from "@/theme";

export type AvatarSize = 56 | 40 | 28 | 22;

export interface AvatarProps {
  name: string;
  size?: AvatarSize;
  /** Highlights this avatar as belonging to the current user with a monte ring. */
  isCurrentUser?: boolean;
  style?: import("react-native").ViewStyle;
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function fontSizeFor(size: AvatarSize): number {
  if (size >= 56) return 22;
  if (size >= 40) return 16;
  if (size >= 28) return 13;
  return 11;
}

/** §6.10 Avatar — initial over `line`. Own avatar gets a monte ring. */
export function Avatar({ name, size = 40, isCurrentUser = false, style }: AvatarProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const circle = (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.initial, { fontSize: fontSizeFor(size) }]}>{getInitial(name)}</Text>
    </View>
  );

  if (!isCurrentUser) {
    return (
      <View accessibilityRole="image" accessibilityLabel={name} style={style}>
        {circle}
      </View>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${name} (vos)`}
      style={[
        styles.ring,
        { width: size + 7, height: size + 7, borderRadius: (size + 7) / 2, padding: 3.5 },
        style,
      ]}
    >
      {circle}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    circle: {
      backgroundColor: c.line,
      alignItems: "center",
      justifyContent: "center",
    },
    initial: {
      fontFamily: fontFamilyForWeight(600),
      fontWeight: "600",
      color: c.ink,
    },
    ring: {
      borderWidth: 2,
      borderColor: c.paper,
      backgroundColor: c.monte,
    },
  });
}
