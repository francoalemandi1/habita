import { StyleSheet, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";

export interface PendingDotProps {
  size?: number;
}

/** §7 Sin conexión — marks an A/B row queued until it syncs (Tinta 3). */
export function PendingDot({ size = 7 }: PendingDotProps): React.JSX.Element {
  const colors = useThemeColors();

  return (
    <View
      accessible
      accessibilityLabel="Pendiente de enviar"
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.ink3 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {},
});
