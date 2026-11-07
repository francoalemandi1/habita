import { useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader, SegmentedControl } from "@/components/ds";
import { EventosPanel } from "@/components/features/planes/eventos-panel";
import { SalidasPanel } from "@/components/features/planes/salidas-panel";
import { useThemeColors } from "@/hooks/use-theme";
import { spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { PlanesSegment } from "@/lib/planes-logic";

const SEGMENT_OPTIONS: { value: PlanesSegment; label: string }[] = [
  { value: "eventos", label: "Eventos" },
  { value: "salidas", label: "Salidas" },
];

/** Planes — the light Casa list of events and AI-suggested salidas (handoff §5.2 `/descubrir` → this + destacado en Casa). */
export default function PlanesScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [segment, setSegment] = useState<PlanesSegment>("eventos");

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader variant="detail" title="Planes" backLabel="Casa" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SegmentedControl
          options={SEGMENT_OPTIONS}
          value={segment}
          onValueChange={setSegment}
          accessibilityLabel="Segmento de Planes"
        />
        {segment === "eventos" ? <EventosPanel /> : <SalidasPanel />}
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
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 32,
      gap: spacing.md,
    },
  });
}
