import { useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CalendarDays } from "lucide-react-native";
import { ScreenHeader, useScreenHeaderScroll } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { spacing } from "@/theme";
import { isTareasSegment, TareasSegments } from "@/components/features/tareas/tareas-segments";
import { SemanaView } from "@/components/features/tareas/semana/semana-view";
import { ListaView } from "@/components/features/tareas/lista/lista-view";
import { RepartoView } from "@/components/features/tareas/reparto/reparto-view";

import type { TareasSegment } from "@/components/features/tareas/tareas-segments";
import type { ThemeColors } from "@/theme";

/** Tareas level 0 (handoff §5.1/§5.3): Semana/Lista/Reparto segmented switcher. */
export default function TareasScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { v } = useLocalSearchParams<{ v?: string }>();
  const segment: TareasSegment = isTareasSegment(v) ? v : "semana";
  const { scrollY, scrollHandler } = useScreenHeaderScroll();

  function handleSegmentChange(next: TareasSegment): void {
    router.setParams({ v: next });
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader
        variant="tab"
        title="Tareas"
        scrollY={scrollY}
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Plan semanal"
            hitSlop={8}
            onPress={() => router.push("/(app)/tareas/plan")}
          >
            <CalendarDays size={22} strokeWidth={1.75} color={colors.monte} />
          </Pressable>
        }
      />

      <View style={styles.segmentsBlock}>
        <TareasSegments value={segment} onValueChange={handleSegmentChange} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {segment === "semana" ? <SemanaView /> : null}
        {segment === "lista" ? <ListaView /> : null}
        {segment === "reparto" ? <RepartoView /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.paper,
    },
    segmentsBlock: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.sm,
    },
    content: {
      flex: 1,
    },
    contentInner: {
      paddingBottom: spacing.xxl,
    },
  });
}
