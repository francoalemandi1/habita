import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { radius, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

export function DashboardSkeleton() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {/* Hero skeleton */}
      <View style={styles.heroSkeleton}>
        <Skeleton width={24} height={24} borderRadius={radius.sm} />
        <Skeleton width="30%" height={36} borderRadius={radius.md} style={{ marginTop: spacing.sm }} />
        <Skeleton width="65%" height={16} style={{ marginTop: spacing.sm }} />
        <Skeleton width="35%" height={14} style={{ marginTop: spacing.lg }} />
      </View>

      {/* Stats row skeleton */}
      <View style={styles.statsRow}>
        <Skeleton width={100} height={32} borderRadius={radius.full} />
        <Skeleton width={80} height={32} borderRadius={radius.full} />
        <Skeleton width={70} height={32} borderRadius={radius.full} />
      </View>

      {/* Highlight skeleton */}
      <View style={styles.highlightSkeleton}>
        <Skeleton width={60} height={20} borderRadius={radius.full} />
        <Skeleton width="80%" height={16} style={{ marginTop: spacing.md }} />
        <Skeleton width="50%" height={14} style={{ marginTop: spacing.sm }} />
        <Skeleton width={90} height={14} style={{ marginTop: spacing.md }} />
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.lg,
    },
    heroSkeleton: {
      borderRadius: radius.xl,
      backgroundColor: c.muted,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
      minHeight: 140,
    },
    statsRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    highlightSkeleton: {
      borderRadius: radius.xl,
      backgroundColor: c.muted,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
  });
}
