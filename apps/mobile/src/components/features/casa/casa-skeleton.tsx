import { StyleSheet, View } from "react-native";
import { Skeleton } from "@/components/ds";
import { spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

/** §6.20 Skeleton for the Casa board while the first queries resolve. */
export function CasaSkeleton(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Skeleton height={160} style={styles.card} />
      <Skeleton height={100} style={styles.card} />
      <Skeleton height={120} style={styles.card} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  card: {
    width: "100%",
    borderRadius: radius.card,
  },
});
